import { readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Where Parallex keeps its instances and workspaces (read only here). */
const support = join(homedir(), "Library", "Application Support", "Parallex");

export type Instance = {
  name: string;
  slug: string;
  /** The instance's own app. */
  wrapperPath: string;
  /** The app it's an instance of. */
  targetApp: string;
  badge?: string;
  color?: string;
};

export type Workspace = { id: string; name: string; members: string[]; color?: string };

/** Every instance, by name. */
export function instances(): Instance[] {
  const folder = join(support, "instances");
  let slugs: string[] = [];
  try {
    slugs = readdirSync(folder);
  } catch {
    return [];
  }
  const found: Instance[] = [];
  for (const slug of slugs) {
    try {
      const record = JSON.parse(readFileSync(join(folder, slug, "instance.json"), "utf8"));
      if (typeof record.name !== "string" || typeof record.wrapperPath !== "string") continue;
      found.push({
        name: record.name,
        slug: record.slug ?? slug,
        wrapperPath: record.wrapperPath,
        targetApp: typeof record.targetApp === "string" ? record.targetApp : "",
        badge: record.settings?.badgeText || undefined,
        color: record.settings?.badgeColorHex || undefined,
      });
    } catch {
      // A record being written, or not Parallex's: skipped.
    }
  }
  return found.sort((a, b) => a.name.localeCompare(b.name));
}

export function workspaces(): Workspace[] {
  try {
    const stored = JSON.parse(readFileSync(join(support, "workspaces.json"), "utf8"));
    const list = Array.isArray(stored) ? stored : stored.workspaces;
    return (Array.isArray(list) ? list : [])
      .filter((w: { name?: unknown }) => typeof w.name === "string")
      .map((w: { id?: string; name: string; members?: string[]; colorHex?: string }) => ({
        id: w.id ?? w.name,
        name: w.name,
        members: Array.isArray(w.members) ? w.members : [],
        color: w.colorHex,
      }));
  } catch {
    return [];
  }
}

// (Instance and workspace names never contain "/".)
const name = (text: string) => encodeURIComponent(text);

/** parallex:// links: they open things, never change or remove them. */
export const links = {
  open: (instance: string) => `parallex://open/${name(instance)}`,
  show: (instance: string) => `parallex://show/${name(instance)}`,
  workspace: (workspace: string) => `parallex://workspace/${name(workspace)}`,
  newInstance: (app: string) => `parallex://new?app=${encodeURIComponent(app)}`,
};

/** "Claude" for /Applications/Claude.app. */
export const appName = (path: string) =>
  path
    .split("/")
    .pop()
    ?.replace(/\.app$/, "") ?? path;
