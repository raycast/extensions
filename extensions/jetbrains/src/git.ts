import { readFile, stat } from "fs/promises";
import { dirname, isAbsolute, resolve } from "path";
import { homedir } from "os";

async function findGitDir(startDir: string): Promise<string | undefined> {
  const stopAt = new Set([homedir(), "/"]);
  let current = startDir;
  while (true) {
    const candidate = resolve(current, ".git");
    try {
      const stats = await stat(candidate);
      if (stats.isDirectory()) {
        return candidate;
      }
      if (stats.isFile()) {
        const contents = await readFile(candidate, "utf8");
        const match = contents.match(/^gitdir:\s*(.+?)\s*$/m);
        if (!match) return undefined;
        const gitdir = match[1];
        return isAbsolute(gitdir) ? gitdir : resolve(current, gitdir);
      }
    } catch {
      // .git not at this level — continue walking up
    }
    if (stopAt.has(current)) return undefined;
    const parent = dirname(current);
    if (parent === current) return undefined;
    current = parent;
  }
}

export async function getGitBranch(projectPath: string): Promise<string | undefined> {
  try {
    const stats = await stat(projectPath);
    const startDir = stats.isDirectory() ? projectPath : dirname(projectPath);
    const gitDir = await findGitDir(startDir);
    if (!gitDir) return undefined;
    const head = await readFile(resolve(gitDir, "HEAD"), "utf8");
    const refMatch = head.match(/^ref:\s*refs\/heads\/(.+?)\s*$/m);
    if (refMatch) return refMatch[1];
    const sha = head.trim();
    return /^[0-9a-f]{40}$/i.test(sha) ? sha.slice(0, 7) : undefined;
  } catch {
    return undefined;
  }
}
