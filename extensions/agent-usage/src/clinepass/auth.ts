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
  beforePersistCommit?: (filePath: string, attempt: number) => void;
}

interface JsonSnapshot {
  contents: string;
  root: Record<string, unknown>;
}

const MAX_PERSIST_ATTEMPTS = 3;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function nonEmptyString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readJsonSnapshot(filePath: string): JsonSnapshot | null {
  try {
    const contents = fs.readFileSync(filePath, "utf8");
    const root = asRecord(JSON.parse(contents));
    return root ? { contents, root } : null;
  } catch {
    return null;
  }
}

function readJson(filePath: string): Record<string, unknown> | null {
  return readJsonSnapshot(filePath)?.root ?? null;
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
  };
}

function readProvidersCredential(filePath: string): ClinePassCredential | null {
  return providersCredentialFromRoot(readJson(filePath), filePath);
}

function legacyCredentialFromRoot(root: Record<string, unknown> | null, filePath: string): ClinePassCredential | null {
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
  };
}

function readLegacyCredential(filePath: string): ClinePassCredential | null {
  return legacyCredentialFromRoot(readJson(filePath), filePath);
}

export function resolveClineHome(env: NodeJS.ProcessEnv = process.env): string {
  const home = env.HOME?.trim() || env.USERPROFILE?.trim() || os.homedir();
  return path.join(home, ".cline");
}

export function readClineCredential(options: ReadClineCredentialOptions = {}): ClinePassCredential | null {
  const clineHome = options.clineHome ?? resolveClineHome();
  return (
    readProvidersCredential(path.join(clineHome, CURRENT_AUTH_PATH)) ??
    readLegacyCredential(path.join(clineHome, LEGACY_AUTH_PATH))
  );
}

export function rereadClineCredential(credential: ClinePassCredential): ClinePassCredential | null {
  if (!credential.sourcePath) return null;
  return credential.source === "providers"
    ? readProvidersCredential(credential.sourcePath)
    : credential.source === "legacy"
      ? readLegacyCredential(credential.sourcePath)
      : null;
}

export function formatClineApiToken(token: string): string {
  if (token.startsWith("sk_") || token.startsWith("workos:")) return token;
  return `workos:${token}`;
}

function stripWorkosPrefix(token: string): string {
  return token.startsWith("workos:") ? token.slice("workos:".length) : token;
}

function parseExpiresAt(value: string | number): number | null {
  const parsed = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function writeJsonAtomicIfUnchanged(
  filePath: string,
  expectedContents: string,
  value: unknown,
  beforeCommit?: () => void,
): boolean {
  const temporaryPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
    beforeCommit?.();
    if (fs.readFileSync(filePath, "utf8") !== expectedContents) {
      fs.rmSync(temporaryPath, { force: true });
      return false;
    }
    fs.renameSync(temporaryPath, filePath);
    return true;
  } catch (error) {
    try {
      fs.rmSync(temporaryPath, { force: true });
    } catch {
      // Preserve the original write error.
    }
    throw error;
  }
}

function credentialsMatch(left: ClinePassCredential, right: ClinePassCredential): boolean {
  return left.token === right.token && left.refreshToken === right.refreshToken && left.userId === right.userId;
}

function persistProvidersCredential(
  original: ClinePassCredential,
  refreshed: RefreshResponse,
  expiresAt: number,
  beforePersistCommit?: (filePath: string, attempt: number) => void,
): ClinePassCredential {
  const filePath = original.sourcePath as string;
  for (let attempt = 0; attempt < MAX_PERSIST_ATTEMPTS; attempt += 1) {
    const snapshot = readJsonSnapshot(filePath);
    const latest = providersCredentialFromRoot(snapshot?.root ?? null, filePath);
    if (!snapshot || !latest) {
      throw new Error("Cline provider credentials disappeared while they were being refreshed.");
    }
    if (!credentialsMatch(original, latest)) return latest;

    const root = snapshot.root;
    const providers = asRecord(root.providers);
    const cline = asRecord(providers?.cline);
    const settings = asRecord(cline?.settings);
    const auth = asRecord(settings?.auth);
    if (!providers || !cline || !settings || !auth) {
      throw new Error("Cline provider settings changed shape while credentials were being refreshed.");
    }
    const oldMetadata = asRecord(auth.metadata) ?? {};
    const oldUserInfo = asRecord(oldMetadata.userInfo) ?? {};
    const userInfo = refreshed.userInfo ?? {};
    const accountId = nonEmptyString(userInfo.clineUserId) ?? original.userId;
    settings.auth = {
      ...auth,
      accessToken: formatClineApiToken(refreshed.accessToken),
      refreshToken: refreshed.refreshToken ?? original.refreshToken,
      expiresAt,
      accountId,
      metadata: {
        ...oldMetadata,
        userInfo: { ...oldUserInfo, ...userInfo },
      },
    };
    cline.updatedAt = Date.now();
    if (writeJsonAtomicIfUnchanged(filePath, snapshot.contents, root, () => beforePersistCommit?.(filePath, attempt))) {
      const saved = readProvidersCredential(filePath);
      if (!saved) throw new Error("Cline provider credentials disappeared after they were refreshed.");
      return saved;
    }
  }
  throw new Error("Cline provider settings kept changing while credentials were being refreshed.");
}

function persistLegacyCredential(
  original: ClinePassCredential,
  refreshed: RefreshResponse,
  expiresAt: number,
  beforePersistCommit?: (filePath: string, attempt: number) => void,
): ClinePassCredential {
  const filePath = original.sourcePath as string;
  for (let attempt = 0; attempt < MAX_PERSIST_ATTEMPTS; attempt += 1) {
    const snapshot = readJsonSnapshot(filePath);
    const latest = legacyCredentialFromRoot(snapshot?.root ?? null, filePath);
    if (!snapshot || !latest) {
      throw new Error("Legacy Cline credentials disappeared while they were being refreshed.");
    }
    if (!credentialsMatch(original, latest)) return latest;

    const root = snapshot.root;
    const encoded = nonEmptyString(root["cline:clineAccountId"]);
    if (!encoded) throw new Error("Legacy Cline credentials changed shape while they were being refreshed.");
    const auth = asRecord(JSON.parse(encoded));
    if (!auth) throw new Error("Legacy Cline credentials are invalid.");
    const oldUserInfo = asRecord(auth.userInfo) ?? {};
    const userInfo = refreshed.userInfo ?? {};
    auth.idToken = stripWorkosPrefix(refreshed.accessToken);
    auth.refreshToken = refreshed.refreshToken ?? original.refreshToken;
    auth.expiresAt = Math.floor(expiresAt / 1000);
    auth.userInfo = {
      ...oldUserInfo,
      ...userInfo,
      id: nonEmptyString(userInfo.clineUserId) ?? original.userId,
      displayName: nonEmptyString(userInfo.name) ?? nonEmptyString(oldUserInfo.displayName) ?? undefined,
    };
    root["cline:clineAccountId"] = JSON.stringify(auth);
    if (writeJsonAtomicIfUnchanged(filePath, snapshot.contents, root, () => beforePersistCommit?.(filePath, attempt))) {
      const saved = readLegacyCredential(filePath);
      if (!saved) throw new Error("Legacy Cline credentials disappeared after they were refreshed.");
      return saved;
    }
  }
  throw new Error("Legacy Cline secrets kept changing while credentials were being refreshed.");
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
  if (credential.source === "manual" || !credential.sourcePath || !credential.refreshToken) {
    return {
      credential: null,
      error: { type: "unauthorized", message: "This Cline credential cannot be refreshed automatically." },
    };
  }
  try {
    const refreshed = await (options.requestRefresh ?? requestRefresh)(credential.refreshToken);
    const expiresAt = parseExpiresAt(refreshed.expiresAt);
    if (!expiresAt) throw new Error("Cline returned an invalid credential expiration date.");
    const saved =
      credential.source === "providers"
        ? persistProvidersCredential(credential, refreshed, expiresAt, options.beforePersistCommit)
        : persistLegacyCredential(credential, refreshed, expiresAt, options.beforePersistCommit);
    return { credential: saved, error: null };
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

export async function ensureFreshClineCredential(
  credential: ClinePassCredential,
): Promise<{ credential: ClinePassCredential | null; error: ClinePassError | null }> {
  if (credential.source === "manual" || !credential.expiresAt || credential.expiresAt > Date.now() + 5 * 60 * 1000) {
    return { credential, error: null };
  }
  return refreshClineCredential(credential);
}

export async function recoverClineCredential(
  credential: ClinePassCredential,
): Promise<{ credential: ClinePassCredential | null; error: ClinePassError | null }> {
  if (credential.source === "manual") {
    return { credential: null, error: { type: "unauthorized", message: "The ClinePass API key is invalid." } };
  }
  const reread = rereadClineCredential(credential);
  if (reread && !credentialsMatch(credential, reread)) return ensureFreshClineCredential(reread);
  return refreshClineCredential(reread ?? credential);
}
