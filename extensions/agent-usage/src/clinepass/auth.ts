import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { httpFetch } from "../agents/http.ts";
import type { ClinePassCredential, ClinePassError } from "./types.ts";

const CURRENT_AUTH_PATH = path.join("data", "settings", "providers.json");
const LEGACY_AUTH_PATH = path.join("data", "secrets.json");

interface ReadClineCredentialOptions {
  clineHome?: string;
}

interface RefreshResponse {
  accessToken: string;
  refreshToken?: string;
  expiresAt: string | number;
  userInfo?: {
    clineUserId?: string;
    email?: string;
    name?: string;
    [key: string]: unknown;
  };
}

interface RefreshOptions {
  requestRefresh?: (refreshToken: string) => Promise<RefreshResponse>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readJson(filePath: string): Record<string, unknown> | null {
  try {
    return asRecord(JSON.parse(fs.readFileSync(filePath, "utf8")));
  } catch {
    return null;
  }
}

function labelFromUserInfo(userInfo: Record<string, unknown> | null, fallback: string): string {
  return (
    nonEmptyString(userInfo?.name) ??
    nonEmptyString(userInfo?.displayName) ??
    nonEmptyString(userInfo?.email) ??
    fallback
  );
}

function providersCredentialFromRoot(
  root: Record<string, unknown> | null,
  filePath: string,
  clineHome: string,
): ClinePassCredential | null {
  const providers = asRecord(root?.providers);
  const cline = asRecord(providers?.cline);
  const settings = asRecord(cline?.settings);
  const auth = asRecord(settings?.auth);
  const token = nonEmptyString(auth?.accessToken);
  const userId = nonEmptyString(auth?.accountId);
  if (!token || !userId?.startsWith("usr-")) return null;

  const metadata = asRecord(auth?.metadata);
  const userInfo = asRecord(metadata?.userInfo);
  return {
    id: "clinepass-auto",
    label: labelFromUserInfo(userInfo, userId),
    token,
    userId,
    refreshToken: nonEmptyString(auth?.refreshToken) ?? undefined,
    expiresAt: typeof auth?.expiresAt === "number" && Number.isFinite(auth.expiresAt) ? auth.expiresAt : undefined,
    source: "providers",
    sourcePath: filePath,
    clineHome,
  };
}

function legacyCredentialFromRoot(
  root: Record<string, unknown> | null,
  filePath: string,
  clineHome: string,
): ClinePassCredential | null {
  const encoded = nonEmptyString(root?.["cline:clineAccountId"]);
  if (!encoded) return null;

  let auth: Record<string, unknown> | null;
  try {
    auth = asRecord(JSON.parse(encoded));
  } catch {
    return null;
  }
  const token = nonEmptyString(auth?.idToken);
  const userInfo = asRecord(auth?.userInfo);
  const userId = nonEmptyString(userInfo?.id);
  if (!token || !userId?.startsWith("usr-")) return null;
  const expiresAtSeconds = auth?.expiresAt;

  return {
    id: "clinepass-auto",
    label: labelFromUserInfo(userInfo, userId),
    token,
    userId,
    refreshToken: nonEmptyString(auth?.refreshToken) ?? undefined,
    expiresAt:
      typeof expiresAtSeconds === "number" && Number.isFinite(expiresAtSeconds) ? expiresAtSeconds * 1000 : undefined,
    source: "legacy",
    sourcePath: filePath,
    clineHome,
  };
}

export function resolveClineHome(env: NodeJS.ProcessEnv = process.env): string {
  const home = env.HOME?.trim() || env.USERPROFILE?.trim() || os.homedir();
  return path.join(home, ".cline");
}

export function readClineCredentials(options: ReadClineCredentialOptions = {}): ClinePassCredential[] {
  const clineHome = options.clineHome ?? resolveClineHome();
  const candidates = [
    providersCredentialFromRoot(
      readJson(path.join(clineHome, CURRENT_AUTH_PATH)),
      path.join(clineHome, CURRENT_AUTH_PATH),
      clineHome,
    ),
    legacyCredentialFromRoot(
      readJson(path.join(clineHome, LEGACY_AUTH_PATH)),
      path.join(clineHome, LEGACY_AUTH_PATH),
      clineHome,
    ),
  ].filter((credential): credential is ClinePassCredential => credential !== null);

  const seen = new Set<string>();
  return candidates.filter((credential) => {
    const key = `${credential.userId}\n${credential.token}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function readClineCredential(options: ReadClineCredentialOptions = {}): ClinePassCredential | null {
  return readClineCredentials(options)[0] ?? null;
}

export function formatClineApiToken(token: string): string {
  if (token.startsWith("sk_") || token.startsWith("workos:")) return token;
  return `workos:${token}`;
}

function parseExpiresAt(value: string | number): number | null {
  const parsed = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

async function requestRefresh(refreshToken: string): Promise<RefreshResponse> {
  const result = await httpFetch({
    url: "https://api.cline.bot/api/v1/auth/refresh",
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ refreshToken, grantType: "refresh_token" }),
  });
  if (result.error) throw new Error(result.error.message);
  const envelope = asRecord(result.data);
  const data = asRecord(envelope?.data);
  const accessToken = nonEmptyString(data?.accessToken);
  const expiresAt = data?.expiresAt;
  if (
    envelope?.success !== true ||
    !data ||
    !accessToken ||
    (typeof expiresAt !== "string" && typeof expiresAt !== "number")
  ) {
    throw new Error(nonEmptyString(envelope?.error) ?? "Cline returned an invalid token refresh response.");
  }
  return {
    accessToken,
    refreshToken: nonEmptyString(data.refreshToken) ?? undefined,
    expiresAt,
    userInfo: (asRecord(data.userInfo) as RefreshResponse["userInfo"]) ?? undefined,
  };
}

export async function refreshClineCredential(
  credential: ClinePassCredential,
  options: RefreshOptions = {},
): Promise<{ credential: ClinePassCredential | null; error: ClinePassError | null }> {
  if (credential.source === "manual" || !credential.refreshToken) {
    return {
      credential: null,
      error: { type: "unauthorized", message: "This Cline credential cannot be refreshed automatically." },
    };
  }
  try {
    const refreshed = await (options.requestRefresh ?? requestRefresh)(credential.refreshToken);
    const expiresAt = parseExpiresAt(refreshed.expiresAt);
    if (!expiresAt) throw new Error("Cline returned an invalid credential expiration date.");
    const userInfo = asRecord(refreshed.userInfo);
    return {
      credential: {
        id: "clinepass-auto",
        label: labelFromUserInfo(userInfo, credential.label),
        token: formatClineApiToken(refreshed.accessToken),
        userId: nonEmptyString(userInfo?.clineUserId) ?? credential.userId,
        refreshToken: refreshed.refreshToken ?? credential.refreshToken,
        expiresAt,
        source: "local",
        clineHome: credential.clineHome,
      },
      error: null,
    };
  } catch (error) {
    return {
      credential: null,
      error: {
        type: "unauthorized",
        message: `Unable to refresh Cline credentials: ${error instanceof Error ? error.message : String(error)}`,
      },
    };
  }
}
