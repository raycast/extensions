// The Eidos projects this machine knows (Raycast Extension REQ1): the ones Eidos MD opened lately, from its own
// state.json (REQ10), the ones in the projects folder, and the folders named in the extension's preferences.
import { existsSync, readFileSync } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

export interface Project {
  root: string;
  name: string;
  // when Eidos MD last opened it, as an ISO time; null for one found only in a folder
  opened: string | null;
}

const SKIPPED = new Set(["node_modules", "dist"]);

// Where Eidos MD keeps what belongs to no project, as the CLI's appDataDir has it.
export function appDataDir(env: NodeJS.ProcessEnv = process.env, platform: NodeJS.Platform = process.platform): string {
  if (env.EIDOS_APP_DATA) return path.resolve(env.EIDOS_APP_DATA);
  if (platform === "win32") return path.join(env.APPDATA ?? path.join(homedir(), "AppData", "Roaming"), "eidosmd");
  return path.join(homedir(), "Library", "Application Support", "eidosmd");
}

export function isProject(folder: string): boolean {
  return (
    existsSync(path.join(folder, ".eidos", "Framework.yaml")) || existsSync(path.join(folder, ".eidos", "Framework.md"))
  );
}

// The app's recent list, newest first. Only `recent[].root` and `recent[].opened` are read: that is the contract the
// app keeps (The Desktop App REQ8). A file that is missing or unreadable gives none.
export function recentProjects(dataDir: string): Array<{ root: string; opened: string }> {
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path.join(dataDir, "state.json"), "utf8"));
  } catch {
    return [];
  }
  if (typeof raw !== "object" || raw === null) return [];
  const recent = (raw as { recent?: unknown }).recent;
  if (!Array.isArray(recent)) return [];
  const entries: Array<{ root: string; opened: string }> = [];
  for (const entry of recent) {
    if (typeof entry !== "object" || entry === null) continue;
    const { root, opened } = entry as { root?: unknown; opened?: unknown };
    if (typeof root === "string" && typeof opened === "string") entries.push({ root, opened });
  }
  return entries;
}

// The projects folder (The Desktop App REQ37): Documents/Eidos unless the person chose another, which the app keeps as
// `projects_folder` in its preferences.yaml.
export function projectsFolder(dataDir: string, home: string = homedir()): string {
  const fallback = path.join(home, "Documents", "Eidos");
  let text: string;
  try {
    text = readFileSync(path.join(dataDir, "preferences.yaml"), "utf8");
  } catch {
    return fallback;
  }
  const line = /^projects_folder:[ \t]*(.*)$/m.exec(text);
  const value = line?.[1]?.trim().replace(/^(["'])(.*)\1$/, "$2") ?? "";
  if (value === "" || value === "null" || value === "~") return fallback;
  const whole = value.replace(/^~(?=$|[\\/])/, home);
  return path.isAbsolute(whole) ? path.normalize(whole) : fallback;
}

// The projects in and beneath a folder, to `depth` levels; a project's own folders are not searched further, and
// node_modules, dist, and dot-folders never are.
export async function projectsBeneath(folder: string, depth: number): Promise<string[]> {
  if (isProject(folder)) return [folder];
  if (depth === 0) return [];
  let names: string[];
  try {
    names = await readdir(folder);
  } catch {
    return [];
  }
  const children = names
    .filter((name) => !name.startsWith(".") && !SKIPPED.has(name))
    .map((name) => path.join(folder, name));
  const found = await Promise.all(
    children.map(async (child) => {
      const isFolder = await stat(child).then(
        (info) => info.isDirectory(),
        () => false,
      );
      return isFolder ? projectsBeneath(child, depth - 1) : [];
    }),
  );
  return found.flat();
}

// The person's Project Folders, as kept: each folder once, by its whole path, in the order added.
export function withFolders(held: string[], added: string[]): string[] {
  const out = [...held];
  for (const folder of added.map((one) => path.resolve(one))) if (!out.includes(folder)) out.push(folder);
  return out;
}

// A folder as Raycast's own settings show one: the home folder as `~`.
export function shownFolder(folder: string, home: string = homedir()): string {
  if (folder === home) return "~";
  return folder.startsWith(home + path.sep) ? `~${folder.slice(home.length)}` : folder;
}

// A project's name as the app's tab shows it: the product its settings name, else its repository's folder, else its own.
export function projectName(root: string): string {
  try {
    const text = readFileSync(path.join(root, ".eidos", "plugins", "eidosmd", "settings.yaml"), "utf8");
    const product = /^product:[ \t]*(.*)$/m
      .exec(text)?.[1]
      ?.trim()
      .replace(/^(["'])(.*)\1$/, "$2");
    if (product && product !== "null" && product !== "~") return product;
  } catch {
    // no settings yet: the folder names it
  }
  return path.basename(repositoryOf(root) ?? root);
}

// The git repository a folder sits in: the nearest folder at or above it holding .git.
export function repositoryOf(folder: string): string | null {
  let at = folder;
  for (;;) {
    if (existsSync(path.join(at, ".git"))) return at;
    const up = path.dirname(at);
    if (up === at) return null;
    at = up;
  }
}

// Where two projects share a name, each is followed by where it sits in its repository, or by its own folder outside
// one, as the app names its tabs: "eidos.examples · academy".
export function distinctNames(projects: Project[]): Project[] {
  return projects.map((project) => {
    if (projects.filter((other) => other.name === project.name).length < 2) return project;
    const repository = repositoryOf(project.root);
    const place =
      repository && repository !== project.root
        ? path.relative(repository, project.root).split(path.sep).join("/")
        : path.basename(project.root);
    return { ...project, name: `${project.name} · ${place}` };
  });
}

// Every project this machine knows, each once: the app's recent ones first, newest first, then the rest by name.
// A project that has moved or been deleted is left out.
export async function knownProjects(
  options: { dataDir?: string; extraFolders?: string[]; includeRecent?: boolean } = {},
): Promise<Project[]> {
  const dataDir = options.dataDir ?? appDataDir();
  const seen = new Set<string>();
  const out: Project[] = [];
  const recent = options.includeRecent === false ? [] : recentProjects(dataDir);
  for (const { root, opened } of recent) {
    const key = path.resolve(root);
    if (seen.has(key) || !isProject(key)) continue;
    seen.add(key);
    out.push({ root: key, name: projectName(key), opened });
  }
  const found = (
    await Promise.all([
      // the projects folder holds groups and subgroups as folders, so it is searched deeper than a folder named here
      projectsBeneath(projectsFolder(dataDir), 4),
      ...(options.extraFolders ?? []).map((folder) => projectsBeneath(folder, 2)),
    ])
  ).flat();
  const rest: Project[] = [];
  for (const root of found) {
    const key = path.resolve(root);
    if (seen.has(key)) continue;
    seen.add(key);
    rest.push({ root: key, name: projectName(key), opened: null });
  }
  const named = distinctNames([...out, ...rest]);
  const recentCount = out.length;
  const sortedRest = named.slice(recentCount).sort((a, b) => a.name.localeCompare(b.name));
  return [...named.slice(0, recentCount), ...sortedRest];
}
