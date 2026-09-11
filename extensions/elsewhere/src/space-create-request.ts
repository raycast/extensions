import { chmod, lstat, mkdir, readFile, readdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import { normalizeCreateSpacePrompt } from "./control-url";
import { readElsewhereState } from "./state-reader";

export const SPACE_CREATE_REQUEST_DIRECTORY = "elsewhere-control-requests-v1";
export const SPACE_CREATE_REQUEST_SCHEMA_VERSION = 1;
export const SPACE_CREATE_REQUEST_MAX_BYTES = 8_192;
export const SPACE_CREATE_REQUEST_MAX_PENDING = 16;
export const SPACE_CREATE_REQUEST_TTL_MS = 60_000;

const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
const NONCE_PATTERN = /^[A-Za-z0-9_-]{22,128}$/;

export interface SpaceCreateRequestEnvelope {
  schemaVersion: 1;
  kind: "space.create";
  requestId: string;
  nonce: string;
  prompt: string;
  createdAt: string;
  expiresAt: string;
}

export interface PreparedSpaceCreateRequest {
  requestId: string;
  nonce: string;
  requestPath: string;
}

interface WriteRequestOptions {
  now?: Date;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function currentUid(): number | undefined {
  return typeof process.getuid === "function" ? process.getuid() : undefined;
}

async function assertPrivateRegularFile(filePath: string): Promise<void> {
  const metadata = await lstat(filePath);
  if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error("The request envelope is not a regular file.");
  if ((metadata.mode & 0o777) !== 0o600) throw new Error("The request envelope has unsafe permissions.");
  const uid = currentUid();
  if (uid !== undefined && metadata.uid !== uid) throw new Error("The request envelope has an unexpected owner.");
  if (metadata.size > SPACE_CREATE_REQUEST_MAX_BYTES) throw new Error("The request envelope is too large.");
}

async function prepareRequestDirectory(appDataDirectory: string): Promise<string> {
  const parent = await lstat(appDataDirectory);
  if (!parent.isDirectory() || parent.isSymbolicLink()) {
    throw new Error("Elsewhere’s application data location is not a regular directory.");
  }

  const requestDirectory = path.join(appDataDirectory, SPACE_CREATE_REQUEST_DIRECTORY);
  await mkdir(requestDirectory, { mode: 0o700, recursive: true });
  const metadata = await lstat(requestDirectory);
  if (!metadata.isDirectory() || metadata.isSymbolicLink()) {
    throw new Error("Elsewhere’s request location is not a regular directory.");
  }
  const uid = currentUid();
  if (uid !== undefined && metadata.uid !== uid)
    throw new Error("Elsewhere’s request location has an unexpected owner.");
  await chmod(requestDirectory, 0o700);
  return requestDirectory;
}

function envelopeExpiresAt(value: unknown): number | null {
  if (!isObject(value) || typeof value.expiresAt !== "string") return null;
  const expiresAt = Date.parse(value.expiresAt);
  return Number.isFinite(expiresAt) ? expiresAt : null;
}

async function pruneExpiredRequests(requestDirectory: string, now: number): Promise<number> {
  const entries = await readdir(requestDirectory, { withFileTypes: true });
  let pending = 0;
  for (const entry of entries) {
    if ((!entry.name.endsWith(".json") && !entry.name.endsWith(".tmp")) || !entry.isFile() || entry.isSymbolicLink()) {
      continue;
    }
    const requestPath = path.join(requestDirectory, entry.name);
    try {
      await assertPrivateRegularFile(requestPath);
      const metadata = await lstat(requestPath);
      if (now - metadata.mtimeMs >= SPACE_CREATE_REQUEST_TTL_MS) {
        await unlink(requestPath);
        continue;
      }
      if (entry.name.endsWith(".tmp")) {
        pending += 1;
        continue;
      }
      const raw = await readFile(requestPath, "utf8");
      const expiresAt = envelopeExpiresAt(JSON.parse(raw));
      if (expiresAt !== null && expiresAt <= now) {
        await unlink(requestPath);
      } else {
        pending += 1;
      }
    } catch {
      // Leave malformed or unexpectedly owned entries for Elsewhere to reject.
      pending += 1;
    }
  }
  return pending;
}

export async function writeSpaceCreateRequest(
  appDataDirectory: string,
  requestId: string,
  nonce: string,
  prompt: string,
  options: WriteRequestOptions = {},
): Promise<PreparedSpaceCreateRequest> {
  if (!REQUEST_ID_PATTERN.test(requestId)) throw new TypeError("The request identifier is invalid.");
  if (!NONCE_PATTERN.test(nonce)) throw new TypeError("The request nonce is invalid.");

  const normalizedPrompt = normalizeCreateSpacePrompt(prompt);
  const now = options.now ?? new Date();
  const requestDirectory = await prepareRequestDirectory(appDataDirectory);
  const pending = await pruneExpiredRequests(requestDirectory, now.getTime());
  if (pending >= SPACE_CREATE_REQUEST_MAX_PENDING) {
    throw new Error("Elsewhere has too many pending creation requests. Try again shortly.");
  }

  const envelope: SpaceCreateRequestEnvelope = {
    schemaVersion: SPACE_CREATE_REQUEST_SCHEMA_VERSION,
    kind: "space.create",
    requestId,
    nonce,
    prompt: normalizedPrompt,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + SPACE_CREATE_REQUEST_TTL_MS).toISOString(),
  };
  const serialized = JSON.stringify(envelope);
  if (Buffer.byteLength(serialized, "utf8") > SPACE_CREATE_REQUEST_MAX_BYTES) {
    throw new Error("The creation request is too large.");
  }

  const requestPath = path.join(requestDirectory, `${requestId}.json`);
  const temporaryPath = path.join(requestDirectory, `.${requestId}.${nonce}.tmp`);
  try {
    await writeFile(temporaryPath, serialized, { encoding: "utf8", flag: "wx", mode: 0o600 });
    await assertPrivateRegularFile(temporaryPath);
    await rename(temporaryPath, requestPath);
    await assertPrivateRegularFile(requestPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
  return { requestId, nonce, requestPath };
}

export async function prepareSpaceCreateRequest(
  requestId: string,
  nonce: string,
  prompt: string,
): Promise<PreparedSpaceCreateRequest> {
  const state = await readElsewhereState();
  if (state.kind !== "ready" && state.kind !== "stale") {
    throw new Error("Open Elsewhere v13.0.0 or later once, then try again.");
  }
  return writeSpaceCreateRequest(path.dirname(state.snapshotPath), requestId, nonce, prompt);
}

export async function removeSpaceCreateRequest(requestPath: string): Promise<void> {
  await unlink(requestPath).catch((error: unknown) => {
    if (!isObject(error) || error.code !== "ENOENT") throw error;
  });
}
