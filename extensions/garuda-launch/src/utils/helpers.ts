import { existsSync, readdirSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';

/**
 * Expands a leading ~ in paths to the user's home directory.
 */
export function expandHome(path: string): string {
  return path.replace(/^~(?=$|\/)/, homedir());
}

/**
 * Reads all .app bundles in your devices and returns their full paths.
 */
export function readApplications(): string[] {
  const scanDirs = ['/Applications', '/System/Applications', join(homedir(), 'Applications')];

  const foundApps = new Set<string>();
  scanDirs.forEach((dir) => {
    try {
      readdirSync(dir)
        .filter((n) => n.endsWith('.app'))
        .forEach((name) => {
          foundApps.add(resolve(join(dir, name)));
        });
    } catch {
      // Empty catch - directory may not exist
    }
  });

  const finderApp = '/System/Library/CoreServices/Finder.app';
  if (existsSync(finderApp)) foundApps.add(finderApp);

  return Array.from(foundApps).sort();
}

/**
 * Reads all subdirectories under the given base path (projects) and returns their names.
 */
export function readProjects(base: string): string[] {
  try {
    return readdirSync(base, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);
  } catch {
    return [];
  }
}
