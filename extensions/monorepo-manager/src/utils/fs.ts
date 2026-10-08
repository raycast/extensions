import * as fs from 'fs';
import * as path from 'path';
import { SimplifiedWorkspace } from '../types';
import * as cached from './cache';

interface Options {
  ignoreCache?: boolean;
}

export function getDirectSubfolders(folderPath: string, options: Options = {}): SimplifiedWorkspace[] {
  const dirs: SimplifiedWorkspace[] = [];

  if (!options.ignoreCache) {
    const cachedData = cached.get(cached.CacheKeys.CACHED_WORKSPACES);
    if (cachedData) {
      return JSON.parse(cachedData);
    }
  }

  try {
    const nodes = fs.readdirSync(folderPath);

    if (nodes) {
      nodes.forEach((node: string) => {
        const childFolderPath = path.join(folderPath, node);
        const isDir = fs.statSync(childFolderPath).isDirectory();

        if (isDir) {
          const hasPackageJsonFile = isFileExists(path.join(childFolderPath, 'package.json'));

          dirs.push({
            path: childFolderPath,
            name: node,
            hasPackageJsonFile,
          });
        }
      });
    }

    cached.set(cached.CacheKeys.CACHED_WORKSPACES, JSON.stringify(dirs));
  } catch (error) {
    console.error('Can not read folder: ', folderPath, '. Detail error: ', error);
  }

  return dirs;
}

/**
 * Check a file is exist or not
 */
export function isFileExists(filePath: string): boolean {
  try {
    fs.accessSync(filePath);
    return true;
  } catch (e) {
    return false;
  }
}
