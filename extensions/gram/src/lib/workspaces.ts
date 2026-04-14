//
// Gram Workspace types, returned from query (v30+ schema)
// See docs/gram-db.md for full schema documentation.
//
export type GramWorkspaceType = "local" | "remote";

export interface GramBaseWorkspace {
  id: number;
  timestamp: number;
  type: GramWorkspaceType;
  paths: string;
  paths_order: string | null;
  window_id: number | null;
  session_id: string | null;
}

export interface GramLocalWorkspace extends GramBaseWorkspace {
  type: "local";
}

export interface GramRemoteWorkspace extends GramBaseWorkspace {
  type: "remote";
  kind: string;
  host: string;
  user: string | null;
  port: number | null;
  distro: string | null;
}

export type GramWorkspace = GramLocalWorkspace | GramRemoteWorkspace;

//
// Unified types for extension
//

function isWslWorkspace(workspace: GramRemoteWorkspace): boolean {
  return workspace.kind === "wsl" && !!workspace.user && !!workspace.distro;
}

export interface Workspace {
  id: number;
  lastOpened: number;
  type: GramWorkspaceType;
  /** All paths in the workspace */
  paths: string[];
  /** Primary URI for opening (based on first path) */
  uri: string;
  host?: string;
  isOpen?: boolean;
  wsl?: { user: string | null; distro: string | null } | null;
}

/**
 * Get the primary path from a workspace (first path in the array)
 */
export function getPrimaryPath(workspace: Workspace): string {
  return workspace.paths[0] ?? "";
}

/**
 * Check if a workspace has multiple folders
 */
export function isMultiFolder(workspace: Workspace): boolean {
  return workspace.paths.length > 1;
}

/**
 * Parse raw paths string from DB into ordered array of paths.
 * Uses paths_order if available to determine display order.
 */
function parsePathsInOrder(pathsStr: string, pathsOrder: string | null): string[] {
  const paths = pathsStr
    .split("\n")
    .map((path) => path.trim())
    .filter((path) => path);

  if (paths.length === 0) {
    return [];
  }

  // If paths_order is provided, reorder paths accordingly
  if (pathsOrder) {
    const orderedIndices = pathsOrder.split(",").map((i) => parseInt(i.trim(), 10));
    const orderedPaths: string[] = [];
    for (const idx of orderedIndices) {
      if (idx >= 0 && idx < paths.length) {
        orderedPaths.push(paths[idx]);
      }
    }
    // If we got valid ordered paths, use them; otherwise fall back to original order
    if (orderedPaths.length > 0) {
      return orderedPaths;
    }
  }
  return paths;
}

/**
 * Parse timestamp from Gram's DB.
 * Timestamp can be either a date string like "2026-01-17 04:07:13" or a Unix timestamp number.
 */
function parseTimestamp(timestamp: number | string): number {
  if (typeof timestamp === "number") {
    return timestamp;
  }
  // Parse date string like "2026-01-17 04:07:13"
  const date = new Date(timestamp);
  if (!isNaN(date.getTime())) {
    return date.getTime();
  }
  return 0;
}

export function parseGramWorkspace(gramWorkspace: GramWorkspace): Workspace | null {
  if (!gramWorkspace.paths) {
    return null;
  }

  const paths = parsePathsInOrder(gramWorkspace.paths, gramWorkspace.paths_order);

  if (paths.length === 0) {
    return null;
  }

  if (gramWorkspace.type === "local") {
    const processedPaths = paths.map((p) => p.replace(/\/+$/, ""));
    const primaryPath = processedPaths[0];
    return {
      id: gramWorkspace.id,
      lastOpened: parseTimestamp(gramWorkspace.timestamp),
      type: gramWorkspace.type,
      uri: "file://" + primaryPath,
      paths: processedPaths,
    };
  }

  // else TODO: clarify
  if (gramWorkspace.type === "remote") {
    const processedPaths = paths.map((p) => p.replace(/^\/+/, "").replace(/\/+$/, ""));
    const primaryPath = processedPaths[0];
    const uri = `ssh://${gramWorkspace.user ? gramWorkspace.user + "@" : ""}${gramWorkspace.host}${
      gramWorkspace.port ? ":" + gramWorkspace.port : ""
    }/${primaryPath}`;

    const hasWsl = isWslWorkspace(gramWorkspace);
    const wsl = hasWsl ? { user: gramWorkspace.user, distro: gramWorkspace.distro } : null;
    return {
      id: gramWorkspace.id,
      lastOpened: parseTimestamp(gramWorkspace.timestamp),
      type: gramWorkspace.type,
      uri,
      paths: processedPaths,
      host: gramWorkspace.host,
      ...(hasWsl && { wsl }),
    };
  }

  return null;
}
