import fs from "node:fs/promises";
import path from "node:path";
import { git } from "./git";
import { checkRemotes, normalizeRemoteUrl } from "./remotes";
import { findRepoDirs, OFFLOAD_FILE } from "./scan";
import { directorySizes } from "./sizes";
import { parseStatus } from "./status";
import type { OffloadedRepo, Protocol, RemoteInfo, Repo, RepoEntry, RepoIndex } from "./types";
import { errorMessage, mapConcurrent } from "./util";
import { readOffloadFile } from "./offload";

function toPosix(p: string): string {
  return p.split(path.sep).join("/");
}

function baseFields(root: string, fullPath: string) {
  const relativePath = toPosix(path.relative(root, fullPath));
  return {
    name: path.basename(fullPath),
    relativePath,
    fullPath,
    group: toPosix(path.dirname(relativePath)),
  };
}

export function parseRemoteLines(output: string): RemoteInfo[] {
  const byName = new Map<string, RemoteInfo>();
  for (const line of output.split("\n")) {
    const match = /^(\S+)\t(.+?) \((fetch|push)\)$/.exec(line);
    if (!match) continue;
    const [, name, url, kind] = match;
    const existing = byName.get(name) ?? { name, fetchUrl: "" };
    if (kind === "fetch") existing.fetchUrl = url;
    else existing.pushUrl = url;
    byName.set(name, existing);
  }
  // remotes configured push-only still need a usable fetchUrl for display/compare
  for (const remote of byName.values()) {
    if (!remote.fetchUrl && remote.pushUrl) remote.fetchUrl = remote.pushUrl;
  }
  return [...byName.values()];
}

export async function inspectRepo(root: string, fullPath: string, protocol: Protocol): Promise<Repo> {
  const base = baseFields(root, fullPath);
  try {
    const [remotesOut, statusOut, stashOut, lastCommitAt] = await Promise.all([
      git(fullPath, ["remote", "-v"]),
      git(fullPath, ["status", "--porcelain=v2", "--branch"]),
      git(fullPath, ["stash", "list", "--format=%gd"]),
      git(fullPath, ["log", "-1", "--format=%cI"]).catch(() => undefined), // fails on empty repos
    ]);
    const remotes = parseRemoteLines(remotesOut);
    const stashes = stashOut ? stashOut.split("\n").filter(Boolean).length : 0;
    return {
      kind: "repo",
      ...base,
      remotes,
      origin: remotes.find((r) => r.name === "origin"),
      status: parseStatus(statusOut, stashes),
      remoteCheck: checkRemotes(base.relativePath, remotes, protocol),
      lastCommitAt: lastCommitAt || undefined,
    };
  } catch (error) {
    return {
      kind: "repo",
      ...base,
      remotes: [],
      remoteCheck: { state: "unknown", message: "Repository could not be inspected." },
      error: errorMessage(error),
    };
  }
}

export async function inspectOffloaded(root: string, fullPath: string): Promise<OffloadedRepo> {
  const base = baseFields(root, fullPath);
  try {
    const data = await readOffloadFile(fullPath);
    return {
      kind: "offloaded",
      ...base,
      originUrl: data.origin,
      remotes: data.remotes,
      branch: data.branch,
      offloadedAt: data.offloadedAt,
      lastKnownSizeBytes: data.sizeBytes,
    };
  } catch (error) {
    return {
      kind: "offloaded",
      ...base,
      originUrl: "",
      remotes: [],
      error: `Invalid ${OFFLOAD_FILE}: ${errorMessage(error)}`,
    };
  }
}

/** Flag entries whose origin points to the same repository (likely duplicate checkouts). */
export function markDuplicates(entries: RepoEntry[]): void {
  const byOrigin = new Map<string, Repo[]>();
  for (const entry of entries) {
    if (entry.kind !== "repo") continue;
    entry.duplicateOf = undefined;
    const normalized = entry.origin && normalizeRemoteUrl(entry.origin.fetchUrl);
    if (!normalized) continue;
    const list = byOrigin.get(normalized) ?? [];
    list.push(entry);
    byOrigin.set(normalized, list);
  }
  for (const repos of byOrigin.values()) {
    if (repos.length < 2) continue;
    for (const repo of repos) {
      repo.duplicateOf = repos.filter((r) => r !== repo).map((r) => r.relativePath);
    }
  }
}

export interface BuildIndexOptions {
  /** Reuse sizes from a previous index instead of re-running du (fast refreshes). */
  previousSizes?: Map<string, number>;
  onProgress?: (done: number, total: number) => void;
}

export async function buildIndex(
  root: string,
  maxDepth: number,
  protocol: Protocol,
  options: BuildIndexOptions = {},
): Promise<RepoIndex> {
  try {
    const stat = await fs.stat(root);
    if (!stat.isDirectory()) throw new Error("not a directory");
  } catch {
    throw new Error(`Repositories root not found: ${root}. Set it in the extension preferences.`);
  }

  const found = await findRepoDirs(root, maxDepth);
  const total = found.repos.length + found.offloaded.length;
  let done = 0;
  const tick = () => options.onProgress?.(++done, total);

  const repos = await mapConcurrent(found.repos, 8, async (p) => {
    const repo = await inspectRepo(root, p, protocol);
    tick();
    return repo;
  });
  const offloaded = await mapConcurrent(found.offloaded, 8, async (p) => {
    const entry = await inspectOffloaded(root, p);
    tick();
    return entry;
  });

  const entries: RepoEntry[] = [...repos, ...offloaded].sort((a, b) => a.relativePath.localeCompare(b.relativePath));
  markDuplicates(entries);

  if (options.previousSizes) {
    for (const entry of entries) entry.sizeBytes = options.previousSizes.get(entry.fullPath);
  } else {
    const sizes = await directorySizes(entries.map((e) => e.fullPath));
    for (const entry of entries) entry.sizeBytes = sizes.get(entry.fullPath);
  }

  return { root, scannedAt: new Date().toISOString(), entries };
}

/**
 * Re-examine a single path and return its current entry, or null when it is
 * neither a repo nor an offload placeholder anymore (e.g. it was trashed).
 */
export async function inspectPath(root: string, fullPath: string, protocol: Protocol): Promise<RepoEntry | null> {
  let names: string[];
  try {
    names = await fs.readdir(fullPath);
  } catch {
    return null;
  }
  let entry: RepoEntry;
  if (names.includes(".git")) entry = await inspectRepo(root, fullPath, protocol);
  else if (names.includes(OFFLOAD_FILE)) entry = await inspectOffloaded(root, fullPath);
  else return null;
  const sizes = await directorySizes([fullPath]);
  entry.sizeBytes = sizes.get(fullPath);
  return entry;
}
