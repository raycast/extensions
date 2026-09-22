import { promises as fs } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { normalizeURL } from "./links";
import type { SavedLink } from "./model";

export const browsers = [
  { id: "chrome", name: "Chrome", directory: "Google/Chrome" },
  { id: "brave", name: "Brave", directory: "BraveSoftware/Brave-Browser" },
  { id: "edge", name: "Microsoft Edge", directory: "Microsoft Edge" },
  { id: "vivaldi", name: "Vivaldi", directory: "Vivaldi" },
  { id: "chromium", name: "Chromium", directory: "Chromium" },
] as const;
export type BrowserId = (typeof browsers)[number]["id"];
export type BookmarkSource = { browser: BrowserId; profile: string; folders: string[] };
export type Profile = BookmarkSource & { name: string };
export type Bookmark = SavedLink & { source: string; folder: string; folderId: string; ancestors: string[] };
export type BookmarkFolder = { id: string; name: string };
const limit = 20 * 1024 * 1024;
export const sourceId = (s: BookmarkSource) => `${s.browser}:${s.profile}`;
const defaultRoot = () => path.join(homedir(), "Library/Application Support");
function browserPath(browser: BrowserId, root: string) {
  const found = browsers.find((b) => b.id === browser);
  if (!found) throw new Error("This browser is not supported.");
  return path.join(root, found.directory);
}
function profilePath(s: BookmarkSource, root: string) {
  if (!s.profile || s.profile === "." || s.profile === ".." || /[/\\\0]/.test(s.profile))
    throw new Error("Invalid browser profile.");
  return path.join(browserPath(s.browser, root), s.profile);
}
async function readJSON(file: string): Promise<unknown> {
  if ((await fs.stat(file)).size > limit) throw new Error("Bookmark data exceeds 20 MB. Choose a smaller profile.");
  return JSON.parse(await fs.readFile(file, "utf8"));
}
function object(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}
export async function discoverProfiles(root = defaultRoot()) {
  const profiles: Profile[] = [];
  const warnings: string[] = [];
  for (const browser of browsers) {
    try {
      const directory = browserPath(browser.id, root);
      const entries = await fs.readdir(directory, { withFileTypes: true });
      let names: Record<string, unknown> = {};
      try {
        const state = object(await readJSON(path.join(directory, "Local State")));
        names = object(object(state?.profile)?.info_cache) ?? {};
      } catch {
        /* Names are optional; directory names remain usable. */
      }
      for (const entry of entries) {
        if (
          !entry.isDirectory() ||
          !(entry.name === "Default" || /^Profile \d+$/.test(entry.name) || entry.name in names)
        )
          continue;
        const source: BookmarkSource = { browser: browser.id, profile: entry.name, folders: [] };
        const nickname = object(names[entry.name])?.name;
        profiles.push({ ...source, name: `${browser.name} · ${typeof nickname === "string" ? nickname : entry.name}` });
      }
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT")
        warnings.push(
          `${browser.name}: ${(e as NodeJS.ErrnoException).code ?? "Error"} — ${e instanceof Error ? e.message : "Profile directory unavailable"}`,
        );
    }
  }
  return { profiles, warnings };
}
export function parseBookmarks(raw: unknown, source: BookmarkSource, label: string) {
  const data = object(raw);
  const roots = object(data?.roots);
  if (!roots)
    throw new Error(
      "The browser bookmark file could not be read. Close and reopen this command after the browser finishes saving.",
    );
  const links: Bookmark[] = [];
  const folders: BookmarkFolder[] = [];
  let count = 0;
  function walk(value: unknown, names: string[], ancestors: string[], position: string, depth: number) {
    if (++count > 100000 || depth > 100) throw new Error("This bookmark tree is too large or deeply nested.");
    const node = object(value);
    if (!node) return;
    const name = typeof node.name === "string" ? node.name : "";
    if (node.type === "folder") {
      const folderId = `${sourceId(source)}:${String(node.id ?? position)}`;
      const nextNames = [...names, name || "Unnamed Folder"];
      folders.push({ id: folderId, name: nextNames.join(" / ") });
      if (Array.isArray(node.children))
        node.children.forEach((child, i) =>
          walk(child, nextNames, [...ancestors, folderId], `${position}.${i}`, depth + 1),
        );
    } else if (node.type === "url" && typeof node.url === "string") {
      let url: string;
      try {
        url = normalizeURL(node.url);
      } catch {
        return;
      }
      const folder = names.join(" / ");
      const id = createHash("sha256")
        .update(`${sourceId(source)}:${position}:${url}`)
        .digest("hex");
      links.push({
        id,
        url,
        title: (name.trim() || new URL(url).hostname).slice(0, 200),
        description: "",
        tags: [],
        collectionId: "",
        createdAt: "",
        updatedAt: "",
        source: label,
        folder,
        folderId: ancestors.at(-1) ?? "",
        ancestors,
      });
    }
  }
  Object.entries(roots).forEach(([key, root]) => walk(root, [], [], key, 0));
  return { links, folders };
}
export async function readBookmarks(source: BookmarkSource, label: string, root = defaultRoot()) {
  const parsed = parseBookmarks(await readJSON(path.join(profilePath(source, root), "Bookmarks")), source, label);
  if (source.folders.length) {
    const known = new Set(parsed.folders.map((f) => f.id));
    if (source.folders.some((f) => !known.has(f)))
      throw new Error(`${label}: a selected folder no longer exists. Choose folders again in Bookmark Sources.`);
    parsed.links = parsed.links.filter((l) => l.ancestors.some((f) => source.folders.includes(f)));
  }
  return parsed;
}
export function bookmarkError(error: unknown, label: string) {
  const code = (error as NodeJS.ErrnoException).code;
  if (code === "ENOENT")
    return `${label}: no bookmark file found. Save a bookmark in this profile, or choose another profile.`;
  if (code === "EACCES" || code === "EPERM")
    return `${label}: allow Raycast to read this browser's data in macOS System Settings, then retry.`;
  return `${label}: ${error instanceof Error ? error.message : "Unable to read bookmarks."}`;
}
