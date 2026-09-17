import fs from "fs";
import path from "path";
import os from "os";
import { getVSCodeStoragePaths, isWindows, parseFileUri } from "./platform";

/**
 * Shared VS Code storage parsing utilities
 * Consolidates common logic from context-capture.ts and project-discovery.ts
 */

interface VSCodeStorageData {
  // Recent workspaces from different VS Code versions
  openedPathsList?: {
    workspaces3?: string[];
    entries?: Array<string | { folderUri?: string }>;
  };
  profileAssociations?: {
    workspaces?: string[] | Record<string, string>;
  };
  // Backup workspaces (most reliable for current folder)
  backupWorkspaces?: {
    folders?: Array<{ folderUri?: string }>;
  };
  // Menu data for recent items
  lastKnownMenubarData?: {
    menus?: {
      File?: {
        items?: Array<{
          id?: string;
          submenu?: {
            items?: Array<{
              id?: string;
              uri?: { path?: string };
            }>;
          };
        }>;
      };
    };
  };
}

/**
 * Parse a VS Code file:// URI to a file path
 */
export function parseVSCodeUri(uri: string): string {
  const parsed = parseFileUri(uri);
  if (isWindows() && /^\/[A-Za-z]:\//.test(parsed)) {
    return parsed.slice(1).replace(/\//g, "\\");
  }
  return parsed;
}

/**
 * Get all VS Code storage paths to check
 */
export function getStoragePaths(): string[] {
  return getVSCodeStoragePaths(os.homedir(), process.env);
}

/**
 * Parse VS Code storage file and extract recent workspaces
 * Returns array of workspace paths (deduplicated)
 */
export async function parseVSCodeWorkspaces(): Promise<string[]> {
  const workspaces: string[] = [];

  for (const storagePath of getStoragePaths()) {
    try {
      const content = await fs.promises.readFile(storagePath, "utf8");
      const data: VSCodeStorageData = JSON.parse(content);

      // Method 1: openedPathsList.workspaces3 or entries
      const associatedWorkspaces = data.profileAssociations?.workspaces;
      const profileWorkspaces = Array.isArray(associatedWorkspaces)
        ? associatedWorkspaces
        : associatedWorkspaces
          ? Object.keys(associatedWorkspaces)
          : [];
      const recentWorkspaces = [
        ...(data.openedPathsList?.workspaces3 || []),
        ...(data.openedPathsList?.entries || []),
        ...profileWorkspaces,
      ];

      for (const workspace of recentWorkspaces) {
        if (typeof workspace === "string") {
          const workspacePath = parseVSCodeUri(workspace);
          if (path.isAbsolute(workspacePath)) workspaces.push(workspacePath);
        } else if (workspace?.folderUri) {
          const workspacePath = parseVSCodeUri(workspace.folderUri);
          if (path.isAbsolute(workspacePath)) workspaces.push(workspacePath);
        }
      }
    } catch {
      // Storage file doesn't exist or can't be parsed, continue
    }
  }

  // Deduplicate
  return [...new Set(workspaces)];
}

/**
 * Get the most recent workspace that is a git repository
 * Checks backupWorkspaces first (most reliable for current folder),
 * then falls back to recent menu items
 */
export async function getMostRecentGitWorkspace(): Promise<string | undefined> {
  for (const storagePath of getStoragePaths()) {
    try {
      const content = await fs.promises.readFile(storagePath, "utf8");
      const data: VSCodeStorageData = JSON.parse(content);

      // Method 1: Check backupWorkspaces.folders (most reliable for current folder)
      const backupFolders = data.backupWorkspaces?.folders || [];
      for (const folder of backupFolders) {
        if (folder.folderUri) {
          const cleanPath = parseVSCodeUri(folder.folderUri);
          try {
            await fs.promises.access(cleanPath);
            await fs.promises.access(path.join(cleanPath, ".git"));
            return cleanPath;
          } catch {
            // Not a git repo or doesn't exist, continue
          }
        }
      }

      // Method 2: Check recent menu items
      const fileMenu = data.lastKnownMenubarData?.menus?.File;
      if (fileMenu?.items) {
        const recentMenu = fileMenu.items.find(
          (item) => item.id === "submenuitem.MenubarRecentMenu",
        );
        if (recentMenu?.submenu?.items) {
          for (const item of recentMenu.submenu.items) {
            if (item.id === "openRecentFolder" && item.uri?.path) {
              const folderPath = parseVSCodeUri(item.uri.path);
              try {
                await fs.promises.access(folderPath);
                await fs.promises.access(path.join(folderPath, ".git"));
                return folderPath;
              } catch {
                // Not a git repo or doesn't exist, continue
              }
            }
          }
        }
      }
    } catch {
      // Storage file doesn't exist or can't be parsed, try next
    }
  }

  return undefined;
}
