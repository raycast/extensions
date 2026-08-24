import fs from "node:fs/promises";
import path from "node:path";
import { git } from "./git";
import { OFFLOAD_FILE } from "./scan";
import { isClean } from "./status";
import type { Protocol, Repo } from "./types";
import { buildRemoteUrl, coerceCloneUrl, parseRemoteUrl, relativePathForUrl } from "./remotes";
import { errorMessage, mapConcurrent } from "./util";

export interface OpResult {
  fullPath: string;
  relativePath: string;
  ok: boolean;
  skipped?: string;
  error?: string;
}

const NETWORK_TIMEOUT = 120_000;

export async function fetchRepo(repo: Repo): Promise<OpResult> {
  const base = { fullPath: repo.fullPath, relativePath: repo.relativePath };
  if (repo.remotes.length === 0) return { ...base, ok: true, skipped: "no remotes" };
  try {
    await git(repo.fullPath, ["fetch", "--all", "--prune"], { timeoutMs: NETWORK_TIMEOUT });
    return { ...base, ok: true };
  } catch (error) {
    return { ...base, ok: false, error: errorMessage(error) };
  }
}

/** Fast-forward pull only; dirty, detached, and upstream-less repos are skipped, never touched. */
export async function pullRepo(repo: Repo): Promise<OpResult> {
  const base = { fullPath: repo.fullPath, relativePath: repo.relativePath };
  if (repo.remotes.length === 0) return { ...base, ok: true, skipped: "no remotes" };
  if (!repo.status) return { ...base, ok: false, error: repo.error ?? "status unknown" };
  if (repo.status.detached) return { ...base, ok: true, skipped: "detached HEAD" };
  if (!repo.status.upstream) return { ...base, ok: true, skipped: "no upstream" };
  if (repo.status.conflicted > 0) return { ...base, ok: true, skipped: "merge conflicts" };
  if (!isClean(repo.status)) return { ...base, ok: true, skipped: "uncommitted changes" };
  try {
    await git(repo.fullPath, ["pull", "--ff-only"], { timeoutMs: NETWORK_TIMEOUT });
    return { ...base, ok: true };
  } catch (error) {
    return { ...base, ok: false, error: errorMessage(error) };
  }
}

export async function runOnRepos(
  repos: Repo[],
  op: (repo: Repo) => Promise<OpResult>,
  concurrency: number,
  onProgress?: (done: number, total: number) => void,
): Promise<OpResult[]> {
  let done = 0;
  return mapConcurrent(repos, concurrency, async (repo) => {
    const result = await op(repo);
    onProgress?.(++done, repos.length);
    return result;
  });
}

export function summarizeResults(results: OpResult[]): { ok: number; skipped: number; failed: OpResult[] } {
  return {
    ok: results.filter((r) => r.ok && !r.skipped).length,
    skipped: results.filter((r) => r.skipped).length,
    failed: results.filter((r) => !r.ok),
  };
}

export function failureReport(failed: OpResult[]): string {
  return failed.map((r) => `${r.relativePath}: ${r.error}`).join("\n");
}

export interface ClonePlan {
  url: string;
  destination: string;
  relativePath: string;
}

/**
 * Where a URL should be cloned inside the root: root/host/owner/repo.
 * `protocolOverride` rewrites the clone URL; by default the pasted protocol is kept.
 */
export function planClone(
  root: string,
  input: string,
  defaultProtocol: Protocol,
  protocolOverride?: Protocol,
): ClonePlan | undefined {
  const url = coerceCloneUrl(input, defaultProtocol);
  if (!url) return undefined;
  const parsed = parseRemoteUrl(url);
  if (!parsed) return undefined;
  const finalUrl = protocolOverride ? buildRemoteUrl(parsed.host, parsed.path, protocolOverride) : url;
  const relativePath = relativePathForUrl(url);
  if (!relativePath) return undefined;
  return { url: finalUrl, destination: path.join(root, relativePath), relativePath };
}

export async function cloneRepo(plan: ClonePlan): Promise<void> {
  let existing: string[] | undefined;
  try {
    existing = await fs.readdir(plan.destination);
  } catch {
    existing = undefined; // destination does not exist yet — the normal case
  }
  if (existing) {
    const meaningful = existing.filter((n) => n !== ".DS_Store");
    if (meaningful.length === 1 && meaningful[0] === OFFLOAD_FILE) {
      throw new Error(`This repo is offloaded at ${plan.relativePath} — use “Restore Local Copy” instead.`);
    }
    if (meaningful.length > 0) {
      throw new Error(`Destination already exists: ${plan.destination}`);
    }
    // git refuses to clone into a non-empty directory, so clear a stray .DS_Store.
    await fs.rm(path.join(plan.destination, ".DS_Store"), { force: true });
  }
  await fs.mkdir(path.dirname(plan.destination), { recursive: true });
  await git(path.dirname(plan.destination), ["clone", "--", plan.url, plan.destination], { timeoutMs: 15 * 60_000 });
}

/** Remove now-empty parent directories between `from` (exclusive) and `root` (exclusive). */
export async function pruneEmptyParents(root: string, from: string): Promise<void> {
  let dir = path.dirname(from);
  const resolvedRoot = path.resolve(root);
  while (path.resolve(dir) !== resolvedRoot && path.resolve(dir).startsWith(resolvedRoot + path.sep)) {
    try {
      const names = (await fs.readdir(dir)).filter((n) => n !== ".DS_Store");
      if (names.length > 0) return;
      await fs.rm(path.join(dir, ".DS_Store"), { force: true });
      await fs.rmdir(dir);
    } catch {
      return; // stop pruning on any error; leftover empty dirs are harmless
    }
    dir = path.dirname(dir);
  }
}

/** Move a repo to the location its origin URL implies. Returns the new absolute path. */
export async function relocateRepo(root: string, repo: Repo, targetRelativePath: string): Promise<string> {
  const target = path.join(root, targetRelativePath);
  try {
    await fs.stat(target);
    throw new Error(`Target already exists: ${target}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.rename(repo.fullPath, target);
  await pruneEmptyParents(root, repo.fullPath);
  return target;
}
