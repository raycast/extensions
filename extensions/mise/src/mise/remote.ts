import { isRecord, miseJson, MiseOutputError } from "./exec";
import type { MiseLocation } from "./locate";

export type RemoteVersion = { version: string; createdAt?: string; releaseUrl?: string };

export function parseRemote(raw: unknown): RemoteVersion[] {
  if (!Array.isArray(raw)) throw new MiseOutputError("mise ls-remote: expected an array", JSON.stringify(raw));
  return raw.map((entry, index) => {
    if (!isRecord(entry) || typeof entry.version !== "string") {
      throw new MiseOutputError(`mise ls-remote: entry ${index} is not a version`, JSON.stringify(entry));
    }
    const version: RemoteVersion = { version: entry.version };
    if (typeof entry.created_at === "string") version.createdAt = entry.created_at;
    if (typeof entry.release_url === "string") version.releaseUrl = entry.release_url;
    return version;
  });
}

export function listRemote(location: MiseLocation, tool: string): Promise<RemoteVersion[]> {
  return miseJson(location, ["ls-remote", tool], parseRemote);
}
