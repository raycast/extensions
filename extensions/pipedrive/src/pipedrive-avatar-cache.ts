import { LocalStorage, environment } from "@raycast/api";
import { mkdir, readFile, stat, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

import { redactPipedriveSecrets, validatePipedriveDomain } from "./pipedrive-security";

type AvatarPreferences = Pick<Preferences, "domain" | "apiToken">;

type CachedAvatarEntry = {
  pictureKey: string;
  filePath: string;
};

function stablePictureKey(pictureKey: string, pictureUrl: string | undefined | null): string {
  if (pictureKey) return pictureKey;
  if (!pictureUrl) return "";
  return crypto.createHash("sha1").update(pictureUrl).digest("hex");
}

function withApiToken(urlInput: string, apiToken: string): string {
  const url = new URL(urlInput);
  if (!url.searchParams.has("api_token")) {
    url.searchParams.set("api_token", apiToken);
  }
  return url.toString();
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}

function cacheKey(domain: string, entityType: "person", entityId: string): string {
  return `pipedrive-avatar:${domain}:${entityType}:${entityId}`;
}

function contentTypeToExt(contentType: string): string {
  const ct = (contentType || "").toLowerCase();
  if (ct.includes("image/png")) return "png";
  if (ct.includes("image/gif")) return "gif";
  if (ct.includes("image/webp")) return "webp";
  return "jpg";
}

export async function ensurePersonAvatarCached(
  preferences: AvatarPreferences,
  personId: string,
  input: { pictureKey?: string | null; pictureUrl?: string | null; signal?: AbortSignal },
): Promise<string | null> {
  const validation = validatePipedriveDomain(preferences.domain);
  if (!validation.ok) {
    throw new Error(validation.error);
  }

  const rawKey = stablePictureKey((input.pictureKey || "").trim(), input.pictureUrl);
  if (!rawKey) {
    return null;
  }

  const existing = await LocalStorage.getItem<string>(cacheKey(validation.domain, "person", personId));
  if (existing) {
    const parsed = JSON.parse(existing) as CachedAvatarEntry;
    if (parsed.pictureKey === rawKey && (await fileExists(parsed.filePath))) {
      return parsed.filePath;
    }
  }

  if (!input.pictureUrl) {
    return null;
  }

  const downloadUrl = withApiToken(input.pictureUrl, preferences.apiToken);

  let response: Response;
  try {
    response = await fetch(downloadUrl, { method: "get", signal: input.signal });
  } catch (error) {
    throw new Error(
      redactPipedriveSecrets(error instanceof Error ? error.message : String(error), preferences.apiToken),
    );
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    const msg = text
      ? `HTTP ${response.status}: ${response.statusText} — ${text}`
      : `HTTP ${response.status}: ${response.statusText}`;
    throw new Error(redactPipedriveSecrets(msg, preferences.apiToken));
  }

  const bytes = await response.arrayBuffer();
  const ext = contentTypeToExt(response.headers.get("content-type") || "");

  const avatarDir = path.join(environment.supportPath, "avatars", validation.domain, "person", personId);
  await mkdir(avatarDir, { recursive: true });

  const outPath = path.join(avatarDir, `${rawKey}.${ext}`);
  await writeFile(outPath, Buffer.from(bytes));

  const entry: CachedAvatarEntry = { pictureKey: rawKey, filePath: outPath };
  await LocalStorage.setItem(cacheKey(validation.domain, "person", personId), JSON.stringify(entry));

  return outPath;
}

export async function readFileAsBuffer(filePath: string): Promise<Buffer> {
  const data = await readFile(filePath);
  return Buffer.isBuffer(data) ? data : Buffer.from(data);
}
