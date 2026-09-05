import { totalChanges } from "./status";
import type { RepoEntry } from "./types";

export type Filter =
  "all" | "attention" | "remote-issues" | "dirty" | "unsynced" | "offloaded" | `host:${string}` | `owner:${string}`;

export function hasRemoteIssue(entry: RepoEntry): boolean {
  if (entry.error) return true;
  return entry.kind === "repo" && entry.remoteCheck.state !== "ok";
}

/** Reasons an entry needs attention; empty array means healthy. Shared by the list filter and the menu bar. */
export function attentionReasons(entry: RepoEntry): string[] {
  const reasons: string[] = [];
  if (entry.error) reasons.push(entry.error);
  if (entry.kind === "offloaded") return reasons;
  if (entry.remoteCheck.state !== "ok" && entry.remoteCheck.state !== "unknown") {
    reasons.push(entry.remoteCheck.message);
  }
  if (entry.duplicateOf?.length) reasons.push(`Same origin as ${entry.duplicateOf.join(", ")}`);
  if (entry.status) {
    if (entry.status.conflicted > 0) reasons.push("Merge conflicts");
    if (entry.status.ahead > 0 && entry.status.behind > 0) reasons.push("Diverged from upstream");
  }
  return reasons;
}

export function matchesFilter(entry: RepoEntry, filter: Filter): boolean {
  if (filter === "all") return true;
  if (filter === "attention") return attentionReasons(entry).length > 0;
  if (filter === "remote-issues") return hasRemoteIssue(entry);
  if (filter === "offloaded") return entry.kind === "offloaded";
  if (filter === "dirty") {
    return entry.kind === "repo" && !!entry.status && totalChanges(entry.status) > 0;
  }
  if (filter === "unsynced") {
    return entry.kind === "repo" && !!entry.status && (entry.status.ahead > 0 || entry.status.behind > 0);
  }
  if (filter.startsWith("host:")) {
    return entry.relativePath.startsWith(filter.slice("host:".length) + "/");
  }
  if (filter.startsWith("owner:")) {
    return ownerOf(entry) === filter.slice("owner:".length);
  }
  return true;
}

export function hostOf(entry: RepoEntry): string {
  return entry.relativePath.split("/")[0] ?? "";
}

/**
 * Owner = the path segment directly below the host, across all hosts.
 * Empty for host/repo paths without an owner level (e.g. Overleaf project ids).
 */
export function ownerOf(entry: RepoEntry): string {
  const segments = entry.relativePath.split("/");
  return segments.length >= 3 ? segments[1] : "";
}
