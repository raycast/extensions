import { execFile } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cp, lstat, mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import type { VaultItem } from "./items";

const execFileAsync = promisify(execFile);
const MAX_OUTPUT = 16 * 1024 * 1024;
const IGNORE_LINES = [
  "workspace.json",
  "workspace-mobile.json",
  "graph.json",
  ".DS_Store",
  "cache/",
  "Cache/",
  "IndexedDB/",
];

export interface GitCommit {
  hash: string;
  subject: string;
  date: string;
}

function gitPath(defaultVault: string): string {
  return path.join(path.resolve(defaultVault), ".obsidian");
}

async function gitWorktree(defaultVault: string): Promise<string> {
  const vault = path.resolve(defaultVault);
  const nested = path.join(vault, ".obsidian", ".git");
  const root = path.join(vault, ".git");
  if (await exists(nested)) {
    if (!(await lstat(nested)).isDirectory()) throw new Error("Default vault nested Git metadata is not a directory");
    return gitPath(defaultVault);
  }
  if (await exists(root)) {
    if (!(await lstat(root)).isDirectory()) throw new Error("Default vault Git metadata is not a directory");
    return vault;
  }
  return gitPath(defaultVault);
}

async function repoItemPath(defaultVault: string, item: string): Promise<string> {
  return (await gitWorktree(defaultVault)) === path.resolve(defaultVault) ? `.obsidian/${item}` : item;
}

function allowedPath(relativePath: string): string {
  const normalized = relativePath.replaceAll("\\", "/");
  const parts = normalized.split("/");
  if (path.isAbsolute(relativePath) || parts.some((part) => !part || part === "." || part === "..")) {
    throw new Error("Invalid item path");
  }
  if (
    parts.length === 1 &&
    ["app.json", "appearance.json", "hotkeys.json", "community-plugins.json", "core-plugins.json"].includes(parts[0])
  ) {
    return normalized;
  }
  if (parts.length === 2 && parts[0] === "plugins" && parts[1] !== ".git") return normalized;
  if (parts.length === 2 && parts[0] === "themes" && parts[1] !== ".git") return normalized;
  if (parts.length === 2 && parts[0] === "snippets" && parts[1].endsWith(".css")) return normalized;
  if (parts.length === 2 && parts[0] === "latex-snippet-versions" && parts[1].endsWith(".js")) return normalized;
  throw new Error("Item path is outside the configuration allowlist");
}

async function checkedItemPath(
  defaultVault: string,
  relativePath: string,
  allowMissingParent = false,
): Promise<string> {
  const item = allowedPath(relativePath);
  const root = gitPath(defaultVault);
  const rootStats = await lstat(root);
  if (!rootStats.isDirectory() || rootStats.isSymbolicLink())
    throw new Error("Default vault .obsidian must be a real directory");
  const parent = path.join(root, ...item.split("/").slice(0, -1));
  if (parent !== root) {
    try {
      const parentStats = await lstat(parent);
      if (!parentStats.isDirectory() || parentStats.isSymbolicLink())
        throw new Error("Managed source parent must be a real directory");
    } catch (error) {
      if (!allowMissingParent || (error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }
  }
  return path.join(root, ...item.split("/"));
}

async function runGit(defaultVault: string, args: string[], allowedExitCodes: number[] = [0]): Promise<string> {
  try {
    const result = await execFileAsync("git", ["-C", await gitWorktree(defaultVault), ...args], {
      encoding: "utf8",
      maxBuffer: MAX_OUTPUT,
      timeout: 30000,
    });
    return result.stdout;
  } catch (error) {
    const failure = error as Error & { code?: number; stdout?: string; stderr?: string };
    if (typeof failure.code === "number" && allowedExitCodes.includes(failure.code)) return failure.stdout ?? "";
    throw new Error(failure.stderr?.trim() || failure.stdout?.trim() || failure.message);
  }
}

async function exists(itemPath: string): Promise<boolean> {
  try {
    await lstat(itemPath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}

/** ADR-002: initialize history in the source vault and exclude volatile Obsidian state. */
export async function ensureGitRepo(defaultVault: string): Promise<void> {
  const obsidian = gitPath(defaultVault);
  const obsidianStats = await lstat(obsidian);
  if (!obsidianStats.isDirectory() || obsidianStats.isSymbolicLink())
    throw new Error("Default vault .obsidian must be a real directory");
  if (!(await exists(path.join(obsidian, ".git"))) && !(await exists(path.join(path.resolve(defaultVault), ".git")))) {
    await runGit(defaultVault, ["init", "--quiet"]);
  }
  await gitWorktree(defaultVault);

  const ignorePath = path.join(obsidian, ".gitignore");
  let current = "";
  try {
    const ignoreStats = await lstat(ignorePath);
    if (!ignoreStats.isFile() || ignoreStats.isSymbolicLink())
      throw new Error("Default vault .gitignore must be a regular file");
    current = await readFile(ignorePath, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const present = new Set(current.split(/\r?\n/));
  const missing = IGNORE_LINES.filter((line) => !present.has(line));
  if (missing.length > 0)
    await writeFile(ignorePath, `${current}${current && !current.endsWith("\n") ? "\n" : ""}${missing.join("\n")}\n`);
}

/** Commit only one allowlisted item; unrelated staged files remain untouched. */
export async function commitItem(defaultVault: string, relativePath: string, message: string): Promise<boolean> {
  const item = allowedPath(relativePath);
  await ensureGitRepo(defaultVault);
  const fullPath = await checkedItemPath(defaultVault, item);
  if (!(await exists(fullPath))) throw new Error("Cannot commit a missing source item");
  const repoItem = await repoItemPath(defaultVault, item);
  // Register new files as intent-to-add so --only can include them without staging unrelated work.
  await runGit(defaultVault, ["add", "-N", "--", repoItem]);
  const head = await runGit(defaultVault, ["rev-parse", "--verify", "HEAD"], [0, 128]);
  if (head.trim()) {
    const changes = await runGit(defaultVault, ["diff", "--name-only", "HEAD", "--", repoItem]);
    if (!changes.trim()) return false;
  }
  try {
    await runGit(defaultVault, [
      "-c",
      "user.name=Obsidian Symlink Manager",
      "-c",
      "user.email=obsidian-symlink-manager@localhost",
      "commit",
      "--quiet",
      "--only",
      "-m",
      message,
      "--",
      repoItem,
    ]);
    return true;
  } catch (error) {
    if (/nothing to commit|no changes added/i.test((error as Error).message)) return false;
    throw error;
  }
}

export async function getItemHistory(defaultVault: string, relativePath: string): Promise<GitCommit[]> {
  const item = allowedPath(relativePath);
  await ensureGitRepo(defaultVault);
  const hasHead = await runGit(defaultVault, ["rev-parse", "--verify", "HEAD"], [0, 128]);
  if (!hasHead.trim()) return [];
  const output = await runGit(defaultVault, [
    "log",
    "--format=%H%x00%s%x00%cI%x1e",
    "--",
    await repoItemPath(defaultVault, item),
  ]);
  return output
    .split("\x1e")
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => {
      const [hash, subject, date] = row.split("\x00");
      return { hash, subject, date };
    });
}

export async function getItemDiff(item: VaultItem): Promise<string> {
  const relativePath = path.relative(gitPath(item.defaultVault), item.defaultPath);
  allowedPath(relativePath);
  if (item.state === "foreign-link")
    return "This item links to another location and is excluded from managed comparisons.";
  if (!(await exists(item.defaultPath)) || !(await exists(item.targetPath)))
    return "No two local copies are available to compare.";
  try {
    const result = await execFileAsync(
      "git",
      ["diff", "--no-index", "--no-ext-diff", "--", item.defaultPath, item.targetPath],
      {
        encoding: "utf8",
        maxBuffer: MAX_OUTPUT,
        timeout: 30000,
      },
    );
    return result.stdout || "No content differences.";
  } catch (error) {
    const failure = error as Error & { code?: number; stdout?: string; stderr?: string };
    if (failure.code === 1) return failure.stdout || "Files differ.";
    throw new Error(failure.stderr?.trim() || failure.message);
  }
}

export async function getCommitDiff(defaultVault: string, relativePath: string, hash: string): Promise<string> {
  const item = allowedPath(relativePath);
  if (!/^[a-f0-9]{7,40}$/i.test(hash)) throw new Error("Invalid commit hash");
  await ensureGitRepo(defaultVault);
  return runGit(defaultVault, ["show", "--format=fuller", hash, "--", await repoItemPath(defaultVault, item)]);
}

/** Restore an item in the Default Vault after a confirmed UI action. */
export async function revertItem(
  defaultVault: string,
  relativePath: string,
  hash: string,
  confirmed = false,
): Promise<void> {
  const item = allowedPath(relativePath);
  if (!confirmed) throw new Error("Confirm restoration before replacing the Default Vault item");
  if (!/^[a-f0-9]{7,40}$/i.test(hash)) throw new Error("Invalid commit hash");
  await ensureGitRepo(defaultVault);
  const destination = await checkedItemPath(defaultVault, item, true);
  const previous = `${destination}.symlink-manager-${randomUUID()}.backup`;
  const hadPrevious = await exists(destination);
  if (hadPrevious) {
    const sourceStats = await lstat(destination);
    if (sourceStats.isSymbolicLink()) throw new Error("The Default Vault item is a symlink");
    await commitItem(defaultVault, item, `Snapshot before restoring ${item}`);
    await rename(destination, previous);
  }
  try {
    await mkdir(path.dirname(destination), { recursive: true });
    await checkedItemPath(defaultVault, item);
    await runGit(defaultVault, [
      "restore",
      `--source=${hash}`,
      "--worktree",
      "--",
      await repoItemPath(defaultVault, item),
    ]);
    await commitItem(defaultVault, item, `Restored ${item} from ${hash.slice(0, 8)}`);
    if (hadPrevious) {
      // Merge untracked/ignored files (e.g. plugin data) back into the restored folder
      await cp(previous, destination, { recursive: true, force: false });
      await rm(previous, { recursive: true });
    }
  } catch (error) {
    if (await exists(destination)) await rm(destination, { recursive: true });
    if (hadPrevious) await rename(previous, destination);
    throw error;
  }
}
