/* eslint-disable @typescript-eslint/no-explicit-any */

import * as bplist from "bplist-parser";
import * as fs from "fs";
import { executeCommand, executeCommandSync } from "./cached-command";

export const REPOSITORY_TYPE = {
  GIT: "git",
  MERCURIAL: "mercurial",
  UNKNOWN: "unknown",
} as const;

type RepositoryType = (typeof REPOSITORY_TYPE)[keyof typeof REPOSITORY_TYPE];

export interface RepositoryState {
  branch: string | null;
  ahead: string | null;
  behind: string | null;
}

export class RepositoryList {
  private plistPath: string;

  constructor(plistPath: string) {
    this.plistPath = plistPath;
  }

  getSourceTreePlist(): string {
    return this.plistPath;
  }

  getFolderTree(root: any, parent: any): string[] {
    const uid = parent.UID;
    const obj = root[uid];

    if (uid === 0) {
      return [];
    }

    if (obj.parent && obj.parent.UID === 0) {
      return [obj.name];
    }

    return [...this.getFolderTree(root, obj.parent), obj.name];
  }

  getRepositories(): Promise<Repository[]> {
    const plist = this.getSourceTreePlist();

    if (!fs.existsSync(plist)) {
      throw new PlistMissingError();
    }

    return bplist.parseFile(plist).then((result: any) => {
      const root = result[0].$objects;

      const meta = root
        .filter((g: any) => {
          if (typeof g === "object" && g["path"]) {
            return true;
          }
        })
        .map((meta: any) => {
          meta.isLeaf = root[meta.isLeaf.UID];
          meta.path = root[meta.path.UID];
          meta.repositoryType = root[meta.repositoryType.UID];
          meta.name = root[meta.name.UID];
          meta.hashValue = root[meta.hashValue.UID];

          return meta;
        });

      return meta
        .filter((meta: any) => {
          return meta.isLeaf;
        })
        .map((meta: any) => {
          meta.parent = this.getFolderTree(root, meta.parent);
          return meta;
        })
        .map((meta: any) => {
          // I'm not entirely sure what meta.repositoryType represents, so I used a straightforward approach.
          const formattedType = detectRepositoryType(meta.path);

          return {
            hashValue: meta.hashValue,
            name: meta.name,
            exists: fs.existsSync(meta.path),
            path: meta.path,
            tree: meta.parent,
            repositoryType: formattedType,

            getRepositoryState: () => {
              return getRepositoryState(meta.path, formattedType);
            },
          };
        });
    });
  }
}

export function detectRepositoryType(path: string): RepositoryType {
  try {
    executeCommandSync(path, "git rev-parse --show-toplevel");
    return REPOSITORY_TYPE.GIT;
  } catch {
    // ignore
  }

  try {
    executeCommandSync(path, "hg root");
    return REPOSITORY_TYPE.MERCURIAL;
  } catch {
    // ignore
  }

  return REPOSITORY_TYPE.UNKNOWN;
}

export function getGitBranch(path: string) {
  return executeCommand(path, "git rev-parse --abbrev-ref HEAD");
}

export function getGitAhead(path: string) {
  return executeCommand(path, "git rev-list --count @{u}..HEAD");
}

export function getGitBehind(path: string) {
  return executeCommand(path, "git rev-list --count HEAD..@{u}");
}

export function getHgBranch(path: string) {
  return executeCommand(path, "hg branch");
}

export function getHgAhead(path: string) {
  return executeCommand(path, "hg outgoing -q").then((result) => {
    return result?.split("\n").length.toString() ?? "0";
  });
}

export function getHgBehind(path: string) {
  return executeCommand(path, "hg incoming -q").then((result) => {
    return result?.split("\n").length.toString() ?? "0";
  });
}

export function getRepositoryState(path: string, repoType: RepositoryType): Promise<RepositoryState> {
  switch (repoType) {
    case REPOSITORY_TYPE.GIT:
      return Promise.all([getGitBranch(path), getGitAhead(path), getGitBehind(path)]).then(
        ([branch, ahead, behind]) => ({
          branch,
          ahead,
          behind,
        }),
      );

    case REPOSITORY_TYPE.MERCURIAL:
      return Promise.all([getHgBranch(path), getHgAhead(path), getHgBehind(path)]).then(([branch, ahead, behind]) => ({
        branch,
        ahead,
        behind,
      }));

    default:
      return Promise.resolve({
        branch: null,
        ahead: null,
        behind: null,
      });
  }
}

export interface Repository {
  hashValue: number;
  name: string;
  exists: boolean;
  path: string;
  tree: string[];
  repositoryType: RepositoryType;

  getRepositoryState(): Promise<RepositoryState>;
}

export class PlistMissingError extends Error {}
