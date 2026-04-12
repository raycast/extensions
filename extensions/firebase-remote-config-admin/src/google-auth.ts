import { createSign, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { OAuth } from "@raycast/api";
import { OAuthService } from "@raycast/utils";

import { getPreferences } from "./storage";
import type { GoogleAuthStatus, Preferences, ProjectConfig } from "./types";

interface ServiceAccount {
  type?: string;
  project_id?: string;
  private_key_id?: string;
  private_key: string;
  client_email: string;
  token_uri?: string;
}

interface UserAdcCredentials {
  client_id?: string;
  client_secret?: string;
  refresh_token?: string;
  type?: string;
  quota_project_id?: string;
}

interface AccessTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface GoogleUserInfo {
  email?: string;
  name?: string;
}

const FIREBASE_SCOPE = "https://www.googleapis.com/auth/firebase.remoteconfig";
const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/firebase",
  FIREBASE_SCOPE,
].join(" ");

const tokenCache = new Map<
  string,
  { accessToken: string; expiresAt: number }
>();

function getGoogleClientId(preferences: Preferences): string {
  const clientId = preferences.googleClientId?.trim();
  if (!clientId) {
    throw new Error(
      "Set the Google OAuth Client ID in extension preferences to use Google sign-in.",
    );
  }
  return clientId;
}

function createGoogleOAuthService(preferences: Preferences) {
  return new OAuthService({
    client: new OAuth.PKCEClient({
      redirectMethod: OAuth.RedirectMethod.AppURI,
      providerName: "Google",
      providerIcon: "assets/extension-icon.svg",
      providerId: "google-firebase-remote-config",
      description:
        "Connect your Google account to import Firebase projects and access Remote Config.",
    }),
    clientId: getGoogleClientId(preferences),
    scope: GOOGLE_SCOPES,
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    refreshTokenUrl: "https://oauth2.googleapis.com/token",
    bodyEncoding: "url-encoded",
    extraParameters: {
      access_type: "offline",
      prompt: "consent",
      include_granted_scopes: "true",
    },
  });
}

function base64Url(input: string | Buffer): string {
  const buffer = typeof input === "string" ? Buffer.from(input, "utf8") : input;
  return buffer
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function resolveHomePath(rawPath: string): string {
  if (rawPath.startsWith("~/")) {
    return path.join(homedir(), rawPath.slice(2));
  }
  return path.resolve(rawPath);
}

function resolveCredentialPath(rawPath: string): string {
  return resolveHomePath(rawPath);
}

function getAdcFilePath(): string {
  return path.join(
    homedir(),
    ".config",
    "gcloud",
    "application_default_credentials.json",
  );
}

async function loadAdcCredentials(): Promise<UserAdcCredentials | null> {
  try {
    const content = await readFile(getAdcFilePath(), "utf8");
    const parsed = JSON.parse(content) as UserAdcCredentials;
    if (!parsed.refresh_token || !parsed.client_id || !parsed.client_secret) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

async function loadServiceAccount(
  project: ProjectConfig,
): Promise<{ serviceAccount: ServiceAccount; cacheKey: string }> {
  const preferences = getPreferences();
  const credentialPath =
    project.credentialRef?.trim() || preferences.sharedCredentialRef?.trim();
  if (!credentialPath) {
    throw new Error(
      `Project ${project.displayName} has no credentialRef and no shared credential is configured.`,
    );
  }

  const resolvedPath = resolveCredentialPath(credentialPath);
  const content = await readFile(resolvedPath, "utf8");
  const serviceAccount = JSON.parse(content) as ServiceAccount;

  if (!serviceAccount.client_email || !serviceAccount.private_key) {
    throw new Error(`Invalid credential file at ${resolvedPath}.`);
  }

  return {
    serviceAccount,
    cacheKey: `${resolvedPath}:${serviceAccount.client_email}`,
  };
}

function buildAssertion(serviceAccount: ServiceAccount): string {
  const issuedAt = Math.floor(Date.now() / 1000);
  const expiresAt = issuedAt + 3600;
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const claims = {
    iss: serviceAccount.client_email,
    scope: FIREBASE_SCOPE,
    aud: serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    iat: issuedAt,
    exp: expiresAt,
  };

  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(JSON.stringify(claims))}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(serviceAccount.private_key);

  return `${unsigned}.${base64Url(signature)}`;
}

async function exchangeRefreshToken(params: {
  cacheKey: string;
  clientId: string;
  clientSecret: string;
  refreshToken: string;
  scope?: string;
}): Promise<string> {
  const cached = tokenCache.get(params.cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const body = new URLSearchParams({
    client_id: params.clientId,
    client_secret: params.clientSecret,
    refresh_token: params.refreshToken,
    grant_type: "refresh_token",
  });
  if (params.scope) {
    body.set("scope", params.scope);
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || "Failed to exchange refresh token for access token.",
    );
  }

  const payload = (await response.json()) as AccessTokenResponse;
  tokenCache.set(params.cacheKey, {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  });
  return payload.access_token;
}

export async function getServiceAccountAccessToken(
  project: ProjectConfig,
): Promise<string> {
  const { serviceAccount, cacheKey } = await loadServiceAccount(project);
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.accessToken;
  }

  const assertion = buildAssertion(serviceAccount);
  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch(
    serviceAccount.token_uri || "https://oauth2.googleapis.com/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    },
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Failed to get access token for ${project.displayName}: ${errorText || response.statusText}`,
    );
  }

  const payload = (await response.json()) as AccessTokenResponse;
  tokenCache.set(cacheKey, {
    accessToken: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  });
  return payload.access_token;
}

function decodeJwtPayload(
  token: string | undefined,
): Record<string, unknown> | null {
  if (!token) return null;
  const segments = token.split(".");
  if (segments.length < 2) return null;

  const payload = segments[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, "=");
  try {
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<
      string,
      unknown
    >;
  } catch {
    return null;
  }
}

async function fetchGoogleUserInfo(
  accessToken: string,
): Promise<GoogleUserInfo | undefined> {
  const response = await fetch(
    "https://www.googleapis.com/oauth2/v3/userinfo",
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );
  if (!response.ok) return undefined;
  return (await response.json()) as GoogleUserInfo;
}

export async function hasAdcCredentials(): Promise<boolean> {
  return Boolean(await loadAdcCredentials());
}

export async function getAdcAccessToken(): Promise<string> {
  const credentials = await loadAdcCredentials();
  if (!credentials) {
    throw new Error(
      "Application Default Credentials not found. Run `gcloud auth application-default login`.",
    );
  }

  return exchangeRefreshToken({
    cacheKey: `adc:${credentials.client_id}`,
    clientId: credentials.client_id || "",
    clientSecret: credentials.client_secret || "",
    refreshToken: credentials.refresh_token || "",
  });
}

export async function getGoogleAuthStatus(): Promise<GoogleAuthStatus> {
  const adcCredentials = await loadAdcCredentials();
  if (adcCredentials) {
    try {
      const token = await getAdcAccessToken();
      const user = await fetchGoogleUserInfo(token);
      return {
        isLoggedIn: true,
        email: user?.email,
        name: user?.name,
        method: "adc",
      };
    } catch {
      // ignore ADC failures and continue
    }
  }

  const preferences = getPreferences();
  if (!preferences.googleClientId?.trim()) {
    return { isLoggedIn: false };
  }

  const service = createGoogleOAuthService(preferences);
  const tokens = await service.client.getTokens();
  if (!tokens?.accessToken) {
    return { isLoggedIn: false };
  }

  const payload = decodeJwtPayload(tokens.idToken);
  const email = typeof payload?.email === "string" ? payload.email : undefined;
  const name = typeof payload?.name === "string" ? payload.name : undefined;

  return {
    isLoggedIn: true,
    email,
    name,
    method: "oauth",
  };
}

export async function authorizeGoogleAccount(): Promise<string> {
  const service = createGoogleOAuthService(getPreferences());
  return service.authorize();
}

export async function signOutGoogleAccount(): Promise<void> {
  const preferences = getPreferences();
  if (!preferences.googleClientId?.trim()) return;
  const service = createGoogleOAuthService(preferences);
  await service.client.removeTokens();
}

export async function getGoogleAccessToken(): Promise<string> {
  const adcCredentials = await loadAdcCredentials();
  if (adcCredentials) {
    try {
      return await getAdcAccessToken();
    } catch (error) {
      throw new Error(
        error instanceof Error
          ? `ADC found but could not obtain access token. Try \`gcloud auth application-default revoke\` then \`gcloud auth application-default login\`. Detail: ${error.message}`
          : "ADC found but could not obtain access token.",
      );
    }
  }

  const service = createGoogleOAuthService(getPreferences());
  return service.authorize();
}

export async function getGoogleProfileAfterAuthorize(): Promise<GoogleAuthStatus> {
  const token = await authorizeGoogleAccount();
  const user = await fetchGoogleUserInfo(token);
  return {
    isLoggedIn: true,
    email: user?.email,
    name: user?.name,
    method: "oauth",
  };
}

export function createImportedProject(
  projectId: string,
  displayName?: string,
): ProjectConfig {
  return {
    id: randomUUID(),
    projectId,
    displayName: displayName?.trim() || projectId,
    tags: [],
    enabled: true,
    source: "google-import",
  };
}
