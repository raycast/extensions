import { isRecord, miseJson, MiseOutputError } from "./exec";
import type { MiseLocation } from "./locate";

export type InstalledVersion = {
  version: string;
  installPath: string;
  active: boolean;
  requestedVersion?: string;
  source?: { type: string; path: string };
};

export type InstalledTool = { name: string; versions: InstalledVersion[] };

export function parseInstalled(raw: unknown): InstalledTool[] {
  if (!isRecord(raw)) throw new MiseOutputError("mise ls: expected an object keyed by tool", JSON.stringify(raw));
  const tools: InstalledTool[] = [];
  for (const [name, entries] of Object.entries(raw)) {
    if (!Array.isArray(entries)) throw new MiseOutputError(`mise ls: ${name} is not an array`, JSON.stringify(entries));
    const versions = entries
      .filter((entry) => !(isRecord(entry) && entry.installed === false))
      .map((entry) => {
        if (!isRecord(entry) || typeof entry.version !== "string" || typeof entry.install_path !== "string") {
          throw new MiseOutputError(`mise ls: ${name} has a malformed version`, JSON.stringify(entry));
        }
        const version: InstalledVersion = {
          version: entry.version,
          installPath: entry.install_path,
          active: entry.active === true,
        };
        if (typeof entry.requested_version === "string") version.requestedVersion = entry.requested_version;
        const source = entry.source;
        if (isRecord(source) && typeof source.type === "string" && typeof source.path === "string") {
          version.source = { type: source.type, path: source.path };
        }
        return version;
      });
    if (versions.length > 0) tools.push({ name, versions });
  }
  return tools;
}

export function listInstalled(location: MiseLocation): Promise<InstalledTool[]> {
  return miseJson(location, ["ls"], parseInstalled);
}
