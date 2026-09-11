import { createSign } from "node:crypto";
import { readFile, rm } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { getPreferences } from "./storage";
import type { GoogleAuthStatus, ProjectConfig } from "./types";

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

const tokenCache = new Map<
  string,
  { accessToken: string; expiresAt: number }
>();

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

export async function revokeAdcCredentials(): Promise<void> {
  const credentials = await loadAdcCredentials();
  if (credentials?.refresh_token) {
    try {
      await fetch(
        `https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(
          credentials.refresh_token,
        )}`,
        { method: "POST" },
      );
    } catch {
      // Best-effort server-side revoke. Proceed to remove the local file
      // regardless — that is what stops the extension from detecting ADC.
    }
  }
  await rm(getAdcFilePath(), { force: true });
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
  if (!adcCredentials) {
    return { isLoggedIn: false };
  }
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
    return { isLoggedIn: false };
  }
}

export async function getGoogleAccessToken(): Promise<string> {
  try {
    return await getAdcAccessToken();
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Could not obtain an access token via Application Default Credentials. Run \`gcloud auth application-default login\` and try again. Detail: ${error.message}`
        : "Could not obtain an access token via Application Default Credentials. Run `gcloud auth application-default login` and try again.",
    );
  }
}
