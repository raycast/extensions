import {
  Application,
  environment,
  getDefaultApplication,
  getPreferenceValues,
  showToast,
  Toast,
} from '@raycast/api';

import { useEffect, useState } from 'react';
import { homedir } from 'os';
import path from 'path';
import fs from 'fs';
import { promisify } from 'util';
import { exec } from 'child_process';
const execp = promisify(exec);
import parseGitConfig = require('parse-git-config');
import parseGithubURL = require('parse-github-url');

import { Directory, Remote } from './interfaces';

const CACHE_FILE = path.join(
  environment.supportPath,
  'find-sites-on-disk.json',
);
const SCAN_DEPTH = 4;

export async function getDefaultTextEditor(): Promise<Application | null> {
  const exampleFile = path.join(environment.supportPath, 'blank.js');
  try {
    fs.accessSync(exampleFile, fs.constants.R_OK);
  } catch (err) {
    fs.writeFileSync(exampleFile, '// used to determine default text editor');
  }
  try {
    const defaultTextEditor = await getDefaultApplication(exampleFile);
    return defaultTextEditor;
  } catch (err) {
    return null;
  }
}

function readJSONSync(filepath: string) {
  try {
    fs.accessSync(filepath, fs.constants.R_OK);
  } catch (err) {
    return {};
  }
  const jsonData = fs.readFileSync(filepath).toString();
  if (jsonData.length > 0) {
    return JSON.parse(jsonData);
  }
  return {};
}

class Cache {
  version = 1;
  dirs: Directory[];

  constructor() {
    // make support path
    fs.mkdirSync(environment.supportPath, { recursive: true });
    this.dirs = [];
    const cache: Cache = readJSONSync(CACHE_FILE);
    if (cache.version === this.version) {
      this.dirs = cache.dirs;
    }
  }

  save(): void {
    const jsonData = JSON.stringify(this, null, 2) + '\n';
    fs.writeFileSync(CACHE_FILE, jsonData);
  }

  setDirs(dirs: Directory[]): void {
    this.dirs = dirs;
  }

  clear(): void {
    this.dirs = [];
    this.save();
  }
}

function resolvePath(filepath: string): string {
  if (filepath.length > 0 && filepath[0] === '~') {
    return path.join(homedir(), filepath.slice(1));
  }
  return filepath;
}

export function tildifyPath(p: string): string {
  const normalizedPath = path.normalize(p) + path.sep;

  return (
    normalizedPath.indexOf(homedir()) === 0
      ? normalizedPath.replace(homedir() + path.sep, `~${path.sep}`)
      : normalizedPath
  ).slice(0, -1);
}

function gitRemotes(path: string): Remote[] {
  const remotes = [] as Remote[];
  const gitConfig = parseGitConfig.sync({
    cwd: path,
    path: '.git/config',
    expandKeys: true,
  });
  if (gitConfig.remote != null) {
    for (const remoteName in gitConfig.remote) {
      const { url } = gitConfig.remote[remoteName];
      // should work with all git providers, not just github
      const parsed = parseGithubURL(url);
      if (parsed?.host && parsed?.repo) {
        remotes.push({
          name: remoteName,
          host: parsed?.host,
          url: `https://${parsed?.host}/${parsed?.repo}`,
        });
      }
    }
  }
  return remotes;
}

function parsePath(path: string): [string[], string[]] {
  const resolvedPaths: string[] = [];
  const unresolvedPaths: string[] = [];
  const paths = path.split(':');
  paths.map((path) => {
    path = path.trim();
    if (path.length === 0) {
      return;
    }
    const pathToVerify = resolvePath(path.trim());
    try {
      fs.accessSync(pathToVerify, fs.constants.R_OK);
      resolvedPaths.push(pathToVerify);
    } catch (err) {
      unresolvedPaths.push(path);
    }
  });
  return [resolvedPaths, unresolvedPaths];
}

async function parseDirPaths(
  mainPath: string,
  dirPaths: string[],
): Promise<Directory[]> {
  const parsedPaths: Directory[] = dirPaths.map((path) => {
    const fullPath = path.replace('/.netlify', '');
    const name = fullPath.split('/').pop() ?? 'unknown';
    const remotes = gitRemotes(fullPath);

    return {
      name,
      fullPath,
      lastModified: 0,
      remotes,
      siteId: '',
    };
  });

  await Promise.allSettled(
    parsedPaths.map(async (parsedPath) => {
      const lastModified = await getLastModifiedTime(parsedPath.fullPath);
      parsedPath.lastModified = lastModified;
      parsedPath.siteId = getSiteId(parsedPath.fullPath);
    }),
  );

  return parsedPaths;
}

async function getLastModifiedTime(fullPath: string): Promise<number> {
  const statCmd = `stat -f %m ${fullPath}`;
  const { stdout, stderr } = await execp(statCmd);
  if (stderr) {
    console.error(`error: ${stderr}`);
    return 0;
  }
  return Number(stdout) * 1000; // milliseconds
}

function getSiteId(fullPath: string): string {
  const { siteId } = readJSONSync(
    path.join(fullPath, '.netlify', 'state.json'),
  );
  return siteId || '';
}

async function findDirs(paths: string[]): Promise<Directory[]> {
  const cache = new Cache();
  let foundDirs: Directory[] = [];
  await Promise.allSettled(
    paths.map(async (path) => {
      const findCmd = `find -L ${path} -maxdepth ${SCAN_DEPTH} -name .netlify -type d`;
      const { stdout, stderr } = await execp(findCmd);
      if (stderr) {
        showToast(Toast.Style.Failure, 'Find Failed', stderr);
        console.error(`error: ${stderr}`);
        return [];
      }
      const dirPaths = stdout.split('\n').filter((e) => e);
      foundDirs = await parseDirPaths(path, dirPaths);
    }),
  );
  foundDirs.sort((a, b) => (a.lastModified < b.lastModified ? 1 : -1));
  cache.setDirs(foundDirs);
  cache.save();
  return foundDirs;
}

export function useDiskCache(query: string | undefined): {
  data?: { dirs: Directory[] };
  error?: string;
  isLoading: boolean;
} {
  const [data, setData] = useState<{ dirs: Directory[] }>();
  const [error, setError] = useState<string>();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [fetched, setIsFetched] = useState<boolean>(false);
  const cache = new Cache();

  let cancel = false;
  let dirs = cache.dirs;

  function filterDirs(dirs: Directory[], query: string): Directory[] {
    return dirs.filter((dir) =>
      dir.name.toLocaleLowerCase().includes(query.toLowerCase()),
    );
  }

  useEffect(() => {
    async function fetchDirs() {
      if (cancel || fetched) {
        return;
      }
      setError(undefined);

      try {
        const preferences = getPreferenceValues<Preferences.FindLocalSites>();
        if (!preferences.scanPath) {
          setError('Path to scan has not been defined in settings');
          return;
        }
        const [dirPaths, unresolvedPaths] = parsePath(preferences.scanPath);
        if (unresolvedPaths.length > 0) {
          setError(`Could not find ${unresolvedPaths}`);
        }
        const dirs = await findDirs(dirPaths);

        if (!cancel) {
          let filteredDirs = dirs;
          if (query && query?.length > 0) {
            filteredDirs = filterDirs(filteredDirs, query);
          }
          setData({ dirs: filteredDirs });
          setIsFetched(true);
        }
      } catch (e) {
        if (!cancel) {
          setError(e as string);
        }
      } finally {
        if (!cancel) {
          setIsLoading(false);
        }
      }
    }

    if (query && query.length > 0) {
      dirs = filterDirs(dirs, query);
    }

    if (cache.dirs.length > 0) {
      setData({ dirs });
    }

    if (!fetched) {
      fetchDirs();
    }

    return () => {
      cancel = true;
    };
  }, [query]);

  return { data, error, isLoading };
}
