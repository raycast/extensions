import { environment } from "@raycast/api";
import { CacheType, SourceRepo } from "../types";
import path from "path";
import fs from "fs";
import { getRepoKey } from "../common-utils";

export class ApplicationCache {
  repos: SourceRepo[];
  cacheFile: string;

  constructor(cacheName: CacheType) {
    makeSupportPath();
    this.cacheFile = path.join(environment.supportPath, cacheName + ".json");
    this.repos = [];
    try {
      fs.accessSync(this.cacheFile, fs.constants.R_OK);
    } catch (err) {
      return;
    }

    const jsonData = fs.readFileSync(this.cacheFile).toString();
    if (jsonData.length > 0) {
      const cache: ApplicationCache = JSON.parse(jsonData);
      this.repos = cache.repos;
    }
  }

  save(): void {
    const jsonData = JSON.stringify(this, null, 2) + "\n";
    fs.writeFileSync(this.cacheFile, jsonData);
  }

  setCache(repos: SourceRepo[]): void {
    this.repos = repos;
  }

  clear(): void {
    this.repos = [];
    this.save();
  }

  addToCache(repo: SourceRepo): void {
    this.repos = this.repos.filter((r) => getRepoKey(r) !== getRepoKey(repo));
    this.repos.push(repo);
  }

  removeFromCache(repo: SourceRepo): void {
    this.repos = this.repos.filter((r) => getRepoKey(r) !== getRepoKey(repo));
  }
}

function makeSupportPath() {
  fs.mkdirSync(environment.supportPath, { recursive: true });
}
