import { readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { IndexedWorkspace } from "@type/workspaces";
import type { Workspace } from "@type/octarine";
import { WorkspacesCache } from "@lib/cache";
import type { ScannedPath } from "@lib/files";
import { scanPaths } from "@lib/files";
import { extensionPreferences } from "@lib/preferences";
import { normalizeText } from "@lib/utils";

const STORE_PATH = path.join(os.homedir(), "Library", "Application Support", "Octarine", ".store.dat");

/**
 * Finds an indexed workspace by its Octarine name or folder name.
 *
 * @param workspaces Workspaces to search, as returned by `getWorkspaces`.
 * @param name Workspace name to match.
 */
export function findWorkspaceByName(workspaces: Workspace[], name: string): Workspace | undefined {
  const normalized = normalizeText(name);
  if (!normalized) {
    return undefined;
  }

  return (
    workspaces.find((workspace) => normalizeText(workspace.name) === normalized) ??
    workspaces.find((workspace) => normalizeText(path.basename(workspace.path)) === normalized)
  );
}

/**
 * Indexes the workspaces found under the configured root paths.
 *
 * Reads the discovery cache while it matches the current preferences; otherwise scans the
 * roots and rewrites the cache.
 *
 * @param options.refresh Forces a new scan and cache write.
 *
 * @remarks
 * The result includes invalid and ignored entries. Callers can use these flags to filter
 * the workspace list.
 */
export async function getWorkspaces(options?: { refresh?: boolean }): Promise<IndexedWorkspace[]> {
  const { workspaceRoots, excludedWorkspaces: excludedDirectories } = extensionPreferences();
  const refresh = options?.refresh ?? false;
  const cached = refresh ? undefined : WorkspacesCache.read(workspaceRoots, excludedDirectories);
  const workspaces = cached ?? (await scanWorkspaces(workspaceRoots, excludedDirectories));

  if (!cached) {
    WorkspacesCache.write(workspaces, workspaceRoots, excludedDirectories);
  }

  const names = await readWorkspaceNames();
  const indexed = workspaces
    .map((workspace) => {
      const name = names.get(path.resolve(workspace.path)) ?? path.basename(workspace.path);
      return { ...workspace, name, ignored: workspace.ignored || excludedDirectories.has(name.toLowerCase()) };
    })
    .sort((a, b) => a.name.localeCompare(b.name) || a.path.localeCompare(b.path));

  const workspaceIndexByName = new Map<string, number>();
  return indexed.map((workspace) => {
    if (workspace.invalid || workspace.ignored) {
      return workspace;
    }

    const index = workspaceIndexByName.get(workspace.name) ?? 0;
    workspaceIndexByName.set(workspace.name, index + 1);
    return index === 0 ? workspace : { ...workspace, display: `${workspace.name} (${index + 1})` };
  });
}

async function scanWorkspaces(roots: string[], excludedDirectories: Set<string>): Promise<IndexedWorkspace[]> {
  const paths = await scanPaths(roots, excludedDirectories);
  return paths.map(buildIndexedWorkspace);
}

function buildIndexedWorkspace({ path: workspacePath, ignored, invalid }: ScannedPath): IndexedWorkspace {
  return {
    name: path.basename(workspacePath),
    path: workspacePath,
    ignored,
    invalid,
  };
}

async function readWorkspaceNames(): Promise<Map<string, string>> {
  const names = new Map<string, string>();

  try {
    const data: unknown = JSON.parse(await readFile(STORE_PATH, "utf8"));
    const store = isRecord(data) ? data.store : undefined;
    const config = isRecord(store) ? store.config : undefined;
    const workspaces = isRecord(config) ? config.workspaces : undefined;
    if (!isRecord(workspaces)) return names;

    for (const workspace of Object.values(workspaces)) {
      if (
        isRecord(workspace) &&
        typeof workspace.path === "string" &&
        path.isAbsolute(workspace.path) &&
        typeof workspace.name === "string" &&
        workspace.name.trim()
      ) {
        names.set(path.resolve(workspace.path), workspace.name);
      }
    }
  } catch {
    // Octarine's private store is optional; folder names remain the fallback.
  }

  return names;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
