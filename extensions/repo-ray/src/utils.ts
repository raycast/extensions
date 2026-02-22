import * as fs from "fs";
import * as path from "path";
import * as os from "os";

export interface Repo {
  name: string;
  fullPath: string;
}

export function scanRepos(directories: string[]): Repo[] {
  const repos: Repo[] = [];
  for (const dir of directories) {
    const expanded = dir.trim().replace(/^~/, os.homedir());
    if (!fs.existsSync(expanded)) continue;
    try {
      const entries = fs.readdirSync(expanded, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const gitDir = path.join(expanded, entry.name, ".git");
        if (fs.existsSync(gitDir) && fs.statSync(gitDir).isDirectory()) {
          repos.push({ name: entry.name, fullPath: path.join(expanded, entry.name) });
        }
      }
    } catch {
      // skip unreadable directories
    }
  }
  repos.sort((a, b) => a.name.localeCompare(b.name));
  return repos;
}
