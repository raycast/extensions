import { trash } from "@raycast/api";
import fs from "node:fs/promises";
import path from "node:path";
import { git } from "./git";
import { parseRemoteLines } from "./inspect";
import { parseRemoteUrl } from "./remotes";
import { OFFLOAD_FILE } from "./scan";
import { parseStatus } from "./status";
import type { OffloadedRepo, RemoteInfo, Repo } from "./types";
import { errorMessage, pluralize } from "./util";

export interface OffloadFileData {
  schema: "reponizer/offloaded";
  version: 1;
  name: string;
  relativePath: string;
  origin: string;
  remotes: RemoteInfo[];
  branch?: string;
  offloadedAt: string;
  sizeBytes?: number;
  note: string;
}

export class OffloadBlockedError extends Error {
  constructor(public readonly problems: string[]) {
    super(`Repository is not fully synced to its remote:\n• ${problems.join("\n• ")}`);
    this.name = "OffloadBlockedError";
  }
}

export async function readOffloadFile(dir: string): Promise<OffloadFileData> {
  const raw = await fs.readFile(path.join(dir, OFFLOAD_FILE), "utf8");
  const data = JSON.parse(raw) as OffloadFileData;
  // The placeholder may have been written elsewhere (import, another machine), so treat its
  // contents as untrusted: anything passed to git argv must parse as a URL and must not
  // start with "-" (argument injection, e.g. --upload-pack=…).
  if (data.schema !== "reponizer/offloaded" || typeof data.origin !== "string" || !data.origin) {
    throw new Error("missing or invalid origin");
  }
  if (data.origin.startsWith("-") || !parseRemoteUrl(data.origin)) {
    throw new Error(`origin is not a valid git URL: ${data.origin}`);
  }
  if (!Array.isArray(data.remotes)) data.remotes = [];
  data.remotes = data.remotes
    .filter(
      (remote) =>
        typeof remote?.name === "string" &&
        /^[A-Za-z0-9][\w.-]*$/.test(remote.name) &&
        typeof remote?.fetchUrl === "string" &&
        !remote.fetchUrl.startsWith("-") &&
        parseRemoteUrl(remote.fetchUrl) !== undefined,
    )
    // A push URL reaches git argv exactly like a fetch URL, so it has to clear the same bar.
    // Only the push URL is dropped when it does not — the remote itself is still usable.
    .map((remote) =>
      typeof remote.pushUrl === "string" &&
      !remote.pushUrl.startsWith("-") &&
      parseRemoteUrl(remote.pushUrl) !== undefined
        ? remote
        : { ...remote, pushUrl: undefined },
    );
  return data;
}

/**
 * Ignored paths the working copy would take to the Trash. Git never restores these, but they are
 * deliberately outside version control, so callers confirm them instead of blocking. Fully ignored
 * directories are reported as a single entry. Local-only and cheap, so it can run before the
 * confirmation without holding a safety check open across it.
 */
export async function findIgnoredPaths(fullPath: string): Promise<string[]> {
  const out = await git(fullPath, ["status", "--porcelain=v2", "--ignored"]);
  return out
    .split("\n")
    .filter((line) => line.startsWith("! "))
    .map((line) => line.slice(2))
    .filter(Boolean);
}

/**
 * Tags live only in `.git` unless they were pushed, so a re-clone brings back neither the tag
 * nor any commit reachable only through it. Compared against origin by name.
 */
async function findUnpushedTags(fullPath: string, localTags: string[]): Promise<string[]> {
  if (localTags.length === 0) return [];
  let remoteOut: string;
  try {
    remoteOut = await git(fullPath, ["ls-remote", "--tags", "--refs", "origin"], { timeoutMs: 60_000 });
  } catch {
    // Fail closed: tags that cannot be verified are treated as unpushed rather than trashed.
    return [`${pluralize(localTags.length, "tag")} could not be verified against origin`];
  }
  const onOrigin = new Set(
    remoteOut
      .split("\n")
      .map((line) => line.split("\t")[1] ?? "")
      .filter((ref) => ref.startsWith("refs/tags/"))
      .map((ref) => ref.slice("refs/tags/".length)),
  );
  const missing = localTags.filter((tag) => !onOrigin.has(tag));
  if (missing.length === 0) return [];
  const sample = missing
    .slice(0, 3)
    .map((tag) => `“${tag}”`)
    .join(", ");
  return [`${pluralize(missing.length, "tag")} not on origin (${sample}${missing.length > 3 ? ", …" : ""})`];
}

/**
 * Every reason the repo holds state a fresh clone of origin would not reproduce. Empty = safe to
 * offload. Deliberately not cached: it must run immediately before the working copy is trashed,
 * with no user interaction in between, or state created in the meantime would be lost.
 */
async function findUnsyncedState(repo: Repo): Promise<string[]> {
  const problems: string[] = [];

  // Refresh remote-tracking refs first so ahead/upstream checks are trustworthy.
  await git(repo.fullPath, ["fetch", "origin", "--prune"], { timeoutMs: 60_000 });

  const [statusOut, stashOut, branchesOut, tagsOut] = await Promise.all([
    git(repo.fullPath, ["status", "--porcelain=v2", "--branch"]),
    git(repo.fullPath, ["stash", "list", "--format=%gd"]),
    git(repo.fullPath, [
      "for-each-ref",
      "refs/heads",
      "--format=%(refname:short)%09%(upstream:short)%09%(upstream:track)",
    ]),
    git(repo.fullPath, ["for-each-ref", "refs/tags", "--format=%(refname:short)"]),
  ]);

  const stashes = stashOut ? stashOut.split("\n").filter(Boolean).length : 0;
  const status = parseStatus(statusOut, stashes);
  const changes = status.staged + status.unstaged + status.conflicted;
  if (changes > 0) problems.push(pluralize(changes, "uncommitted change"));
  if (status.untracked > 0) problems.push(pluralize(status.untracked, "untracked file"));
  if (stashes > 0) problems.push(pluralize(stashes, "stash", "stashes"));

  for (const line of branchesOut.split("\n").filter(Boolean)) {
    const [branch, upstream, track] = line.split("\t");
    if (!upstream) problems.push(`branch “${branch}” has no upstream (unpushed)`);
    else if (track?.includes("gone")) problems.push(`branch “${branch}” tracks a deleted upstream`);
    else if (track?.includes("ahead")) problems.push(`branch “${branch}” is ahead of ${upstream}`);
  }

  problems.push(...(await findUnpushedTags(repo.fullPath, tagsOut.split("\n").filter(Boolean))));

  // Catch-all for history the per-branch checks cannot see — most notably a detached HEAD.
  // Only reported when nothing above already explains it, and skipped on a repo without commits.
  if (problems.length === 0) {
    const out = await git(repo.fullPath, [
      "rev-list",
      "--count",
      "HEAD",
      "--branches",
      "--tags",
      "--not",
      "--remotes",
    ]).catch(() => "0");
    const localOnly = Number.parseInt(out, 10) || 0;
    if (localOnly > 0) problems.push(`${pluralize(localOnly, "commit")} not reachable from any remote`);
  }

  return problems;
}

/**
 * Remove the local copy of an in-sync repo: the working copy is moved aside,
 * replaced by a folder containing only the offload placeholder file, and then trashed.
 * Throws OffloadBlockedError when any local-only state would be lost. The check runs here rather
 * than being passed in, so a confirmation the caller showed first cannot leave it stale.
 */
export async function offloadRepo(repo: Repo): Promise<string | undefined> {
  if (!repo.origin) throw new Error("Repository has no “origin” remote — nothing to re-download it from later.");

  const problems = await findUnsyncedState(repo);
  if (problems.length > 0) throw new OffloadBlockedError(problems);

  const data: OffloadFileData = {
    schema: "reponizer/offloaded",
    version: 1,
    name: repo.name,
    relativePath: repo.relativePath,
    origin: repo.origin.fetchUrl,
    remotes: repo.remotes,
    branch: repo.status?.branch,
    offloadedAt: new Date().toISOString(),
    sizeBytes: repo.sizeBytes,
    note: "Local copy removed by Reponizer. Use “Restore Local Copy” in Raycast (or git clone the origin URL) to get it back.",
  };

  // Move aside first so a failure while writing the placeholder can be rolled back
  // without the working copy already sitting in the Trash.
  const staging = `${repo.fullPath}.reponizer-offloading`;
  await fs.rename(repo.fullPath, staging);
  try {
    await fs.mkdir(repo.fullPath, { recursive: true });
    await fs.writeFile(path.join(repo.fullPath, OFFLOAD_FILE), JSON.stringify(data, null, 2) + "\n");
  } catch (error) {
    await fs.rm(repo.fullPath, { recursive: true, force: true });
    await fs.rename(staging, repo.fullPath);
    throw error;
  }
  try {
    await trash(staging);
  } catch {
    // The offload itself already succeeded — surface a warning rather than failing.
    return `Offloaded, but the old copy could not be moved to the Trash — it still sits at ${staging}.`;
  }
  return undefined;
}

/** Create an offload placeholder without a prior local copy (used by import). */
export async function writeOffloadPlaceholder(
  fullPath: string,
  relativePath: string,
  origin: string,
  remotes: RemoteInfo[] = [],
): Promise<void> {
  const data: OffloadFileData = {
    schema: "reponizer/offloaded",
    version: 1,
    name: path.basename(fullPath),
    relativePath,
    origin,
    remotes,
    offloadedAt: new Date().toISOString(),
    note: "Placeholder created by Reponizer import. Use “Restore Local Copy” in Raycast (or git clone the origin URL) to download it.",
  };
  // A placeholder hides everything below it from future scans, so never drop one
  // into a folder that already has content.
  let existing: string[] = [];
  try {
    existing = await fs.readdir(fullPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  if (existing.some((n) => n !== ".DS_Store")) {
    throw new Error(`Folder already exists and is not empty: ${fullPath}`);
  }
  await fs.mkdir(fullPath, { recursive: true });
  await fs.writeFile(path.join(fullPath, OFFLOAD_FILE), JSON.stringify(data, null, 2) + "\n");
}

/**
 * Re-download an offloaded repo by cloning its recorded origin back into place.
 * Returns a warning when the clone worked but some remotes could not be recreated.
 */
export async function restoreOffloaded(entry: OffloadedRepo): Promise<string | undefined> {
  const data = await readOffloadFile(entry.fullPath);

  const names = (await fs.readdir(entry.fullPath)).filter((n) => n !== OFFLOAD_FILE && n !== ".DS_Store");
  if (names.length > 0) {
    throw new Error(
      `Folder contains unexpected files (${names.slice(0, 3).join(", ")}) — refusing to clone over them.`,
    );
  }

  await fs.rm(path.join(entry.fullPath, OFFLOAD_FILE));
  await fs.rm(path.join(entry.fullPath, ".DS_Store"), { force: true });
  try {
    await git(path.dirname(entry.fullPath), ["clone", "--", data.origin, entry.fullPath], { timeoutMs: 15 * 60_000 });
  } catch (error) {
    // Put the placeholder back so the entry is not lost on a failed clone (e.g. offline).
    // Remove partial clone debris first, or the next scan would classify this as a broken repo.
    await fs.rm(entry.fullPath, { recursive: true, force: true });
    await fs.mkdir(entry.fullPath, { recursive: true });
    await fs.writeFile(path.join(entry.fullPath, OFFLOAD_FILE), JSON.stringify(data, null, 2) + "\n");
    throw error;
  }

  // `git clone` and `git remote add` point both directions at the same URL, so a recorded push
  // URL that differs from the fetch URL has to be reapplied — otherwise later pushes silently
  // target the fetch destination instead of the one the repo was configured with.
  const failures: string[] = [];
  for (const remote of data.remotes) {
    try {
      if (remote.name !== "origin") {
        await git(entry.fullPath, ["remote", "add", remote.name, remote.fetchUrl]);
      }
      if (remote.pushUrl && remote.pushUrl !== remote.fetchUrl) {
        await git(entry.fullPath, ["remote", "set-url", "--push", remote.name, remote.pushUrl]);
      }
    } catch (error) {
      failures.push(`${remote.name} (${errorMessage(error)})`);
    }
  }
  if (failures.length > 0) {
    // The clone itself succeeded — report the gap rather than discarding a working checkout.
    return `Restored, but these remotes need to be re-added by hand: ${failures.join(", ")}`;
  }
  return undefined;
}

/** Verify the extra remotes recorded during offload are back; used by callers for reporting only. */
export async function listRemotes(fullPath: string): Promise<RemoteInfo[]> {
  return parseRemoteLines(await git(fullPath, ["remote", "-v"]));
}
