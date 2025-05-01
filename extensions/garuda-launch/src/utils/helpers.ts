import { readdirSync, statSync } from 'fs';
import { homedir } from 'os';
import { join, resolve } from 'path';

/**
 * Expands a leading ~ in paths to the user's home directory.
 */
export function expandHome(path: string): string {
  return path.replace(/^~(?=$|\/)/, homedir());
}

/**
 * Reads all .app bundles in /Applications and returns their full paths.
 */
export function readApplications(appsDir: string = '/Applications'): string[] {
  try {
    return readdirSync(appsDir)
      .filter((name) => name.endsWith('.app'))
      .map((name) => resolve(join(appsDir, name)));
  } catch {
    return [];
  }
}

/**
 * Reads all subdirectories under the given base path (projects) and returns their names.
 */
export function readProjects(base: string): string[] {
  try {
    return readdirSync(base).filter((name) => statSync(join(base, name)).isDirectory());
  } catch {
    return [];
  }
}
