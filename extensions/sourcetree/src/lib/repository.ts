import * as bplist from "bplist-parser";
import * as fs from "fs";
import { executeCommand } from "./cached-command";

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

          getBranch: () => {
            return getBranch(meta.path);
          },

          getAhead: () => {
            return getAhead(meta.path);
          },

          getBehind: () => {
            return getBehind(meta.path);
          },
        }));
    });
  }
}

export function getBranch(path: string): Promise<string | null> {
  return executeCommand(path, "git rev-parse --abbrev-ref HEAD");
}

export function getAhead(path: string): Promise<string | null> {
  return executeCommand(path, "git rev-list --count @{u}..HEAD");
}

export function getBehind(path: string): Promise<string | null> {
  return executeCommand(path, "git rev-list --count HEAD..@{u}");
}

export interface Repository {
  hashValue: number;
  name: string;
  exists: boolean;
  path: string;
  tree: string[];

  getBranch(): Promise<string | null>;
  getAhead(): Promise<string | null>;
  getBehind(): Promise<string | null>;
}

export class PlistMissingError extends Error {}
