import { environment } from "@raycast/api";
import { SourceRepo } from "./types";
import path from "path";
import fs from "fs";

const CacheFile = path.join(environment.supportPath, "cache.json");

export class Cache {
  repos: SourceRepo[];

  constructor() {
    makeSupportPath();
    this.repos = [];
    try {
      fs.accessSync(CacheFile, fs.constants.R_OK);
    } catch (err) {
      return;
    }
    const jsonData = fs.readFileSync(CacheFile).toString();
    if (jsonData.length > 0) {
      const cache: Cache = JSON.parse(jsonData);
      this.repos = cache.repos;
    }
  }

  save(): void {
    const jsonData = JSON.stringify(this, null, 2) + "\n";
    fs.writeFileSync(CacheFile, jsonData);
  }

  setRepos(repos: SourceRepo[]): void {
    this.repos = repos;
  }

  clear(): void {
    this.repos = [];
    this.save();
  }
}

function makeSupportPath() {
  fs.mkdirSync(environment.supportPath, { recursive: true });
}
