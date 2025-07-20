/* eslint-disable @typescript-eslint/no-explicit-any */

import * as bplist from "bplist-parser";
import * as fs from "fs";
import { executeCommand } from "./cached-command";

export enum RepositoryType {
  GIT = "git",
  MERCURIAL = "mercurial",
  UNKNOWN = "unknown",
}

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
        .map((meta: any) => ({
          hashValue: meta.hashValue,
          name: meta.name,
          exists: fs.existsSync(meta.path),
          path: meta.path,
          tree: meta.parent,

          getRepositoryState: () => {
            return getRepositoryState(meta.path);
          },
        }));
    });
  }
}

export function detectRepositoryType(path: string): Promise<RepositoryType> {
  return executeCommand(path, "git rev-parse --git-dir")
    .then((gitResult) => {
      if (gitResult) {
        return RepositoryType.GIT;
      }
      return executeCommand(path, "hg root").then((hgResult) => {
        if (hgResult) {
          return RepositoryType.MERCURIAL;
        } else {
          return RepositoryType.UNKNOWN;
        }
      });
    })
    .catch(() => {
      return executeCommand(path, "hg root")
        .then((hgResult) => {
          if (hgResult) {
            return RepositoryType.MERCURIAL;
          } else {
            return RepositoryType.UNKNOWN;
          }
        })
        .catch(() => {
          return RepositoryType.UNKNOWN;
        });
    });
}

export function getGitBranch(path: string): Promise<string | null> {
  return executeCommand(path, "git rev-parse --abbrev-ref HEAD");
}

export function getHgBranch(path: string): Promise<string | null> {
  return executeCommand(path, "hg branch");
}

export function getGitAhead(path: string): Promise<string | null> {
  return executeCommand(path, "git rev-list --count @{u}..HEAD");
}

export function getHgAhead(path: string): Promise<string | null> {
  return executeCommand(path, "hg outgoing -q").then((result) => {
    if (!result) return "0";
    return result.split("\n").length.toString();
  });
}

export function getGitBehind(path: string): Promise<string | null> {
  return executeCommand(path, "git rev-list --count HEAD..@{u}");
}

export function getHgBehind(path: string): Promise<string | null> {
  return executeCommand(path, "hg incoming -q").then((result) => {
    if (!result) return "0";
    return result.split("\n").length.toString();
  });
}

export function getRepositoryState(path: string): Promise<RepositoryState> {
  return detectRepositoryType(path).then((repoType) => {
    switch (repoType) {
      case RepositoryType.GIT:
        return Promise.all([getGitBranch(path), getGitAhead(path), getGitBehind(path)]).then(
          ([branch, ahead, behind]) => ({
            branch,
            ahead,
            behind,
          }),
        );

      case RepositoryType.MERCURIAL:
        return Promise.all([getHgBranch(path), getHgAhead(path), getHgBehind(path)]).then(
          ([branch, ahead, behind]) => ({
            branch,
            ahead,
            behind,
          }),
        );

      default:
        return Promise.resolve({
          branch: null,
          ahead: null,
          behind: null,
        });
    }
  });
}

export interface Repository {
  hashValue: number;
  name: string;
  exists: boolean;
  path: string;
  tree: string[];

  getRepositoryState(): Promise<RepositoryState>;
}

export class PlistMissingError extends Error {}
