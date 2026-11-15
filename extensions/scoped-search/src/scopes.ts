import { LocalStorage } from "@raycast/api";
import { homedir } from "os";
import { resolve, normalize } from "path";

export type Scope = {
  /** Absolute path of the folder to search in. */
  path: string;
  /** Disabled scopes stay in the list but are skipped when searching. */
  enabled: boolean;
};

const STORAGE_KEY = "scoped-search:scopes:v1";

/** Turns "~/Desktop/projects", "~", or a relative path into an absolute path. */
export function expandPath(input: string): string {
  if (/^\/+$/.test(input.trim())) return "/";
  const trimmed = input.trim().replace(/\/+$/, "");
  if (trimmed === "" || trimmed === "~") return homedir();
  if (trimmed.startsWith("~/"))
    return normalize(resolve(homedir(), trimmed.slice(2)));
  return normalize(resolve(trimmed));
}

/** Renders an absolute path back with a leading ~ so the UI stays readable. */
export function prettyPath(absolute: string): string {
  const home = homedir();
  if (absolute === home) return "~";
  if (absolute.startsWith(home + "/")) return "~" + absolute.slice(home.length);
  return absolute;
}

export async function loadScopes(): Promise<Scope[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is Scope => typeof s?.path === "string")
      .map((s) => ({ path: s.path, enabled: s.enabled !== false }));
  } catch {
    return [];
  }
}

export async function saveScopes(scopes: Scope[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(scopes));
}

/**
 * Adds folders, ignoring duplicates.
 * Returns how many were actually added and which were already present.
 */
export async function addScopes(
  paths: string[],
): Promise<{ added: string[]; duplicates: string[] }> {
  const current = await loadScopes();
  const known = new Set(current.map((s) => s.path));
  const added: string[] = [];
  const duplicates: string[] = [];

  for (const raw of paths) {
    const abs = expandPath(raw);
    if (known.has(abs)) {
      duplicates.push(abs);
      continue;
    }
    known.add(abs);
    current.push({ path: abs, enabled: true });
    added.push(abs);
  }

  if (added.length > 0) await saveScopes(current);
  return { added, duplicates };
}

export async function removeScope(path: string): Promise<void> {
  const current = await loadScopes();
  await saveScopes(current.filter((s) => s.path !== path));
}

export async function toggleScope(path: string): Promise<void> {
  const current = await loadScopes();
  await saveScopes(
    current.map((s) => (s.path === path ? { ...s, enabled: !s.enabled } : s)),
  );
}

export async function moveScope(
  path: string,
  direction: -1 | 1,
): Promise<void> {
  const current = await loadScopes();
  const index = current.findIndex((s) => s.path === path);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= current.length) return;
  const next = [...current];
  [next[index], next[target]] = [next[target], next[index]];
  await saveScopes(next);
}
