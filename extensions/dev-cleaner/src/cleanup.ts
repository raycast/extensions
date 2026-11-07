import { trash } from "@raycast/api";
import path from "node:path";

import { runCommand } from "./lib/command";
import { directorySize, modifiedAt, pathExists } from "./lib/fs";
import { isAbortError } from "./lib/async";
import { assertSafeTrashPath, PROJECT_ARTIFACT_NAMES } from "./lib/path-safety";
import { scanRuntimePins, type RuntimePins } from "./lib/runtime-pins";
import { runtimeProtectionReason } from "./providers/runtime-caches";
import type { CleanupCandidate, CleanupResult, ScanContext } from "./types";

type PinsLoader = () => Promise<RuntimePins>;

/** Scans project runtime pins at most once per cleanup batch, and only when a runtime candidate needs them. */
function lazyPins(context: ScanContext): PinsLoader {
  let pins: Promise<RuntimePins> | undefined;
  return () => (pins ??= scanRuntimePins(context.projectRoots, context.signal));
}

async function assertRuntimeStillRemovable(
  candidate: CleanupCandidate,
  context: ScanContext,
  loadPins: PinsLoader,
): Promise<void> {
  if (candidate.providerId !== "node" && candidate.providerId !== "rustup") return;
  const reason = await runtimeProtectionReason(candidate, context, await loadPins());
  if (reason) throw new Error(`Runtime became protected after the scan (${reason}); refresh before cleaning it`);
}

function allowedRoots(candidate: CleanupCandidate, context: ScanContext): string[] {
  if (candidate.providerId === "projects") return context.projectRoots;
  if (candidate.providerId === "xcode") {
    return [path.join(context.homeDirectory, "Library/Developer/Xcode/DerivedData")];
  }
  if (candidate.providerId === "simulator") {
    return [
      path.join(context.homeDirectory, "Library/Developer/CoreSimulator"),
      path.join(context.homeDirectory, "Library/Developer/Xcode/iOS DeviceSupport"),
    ];
  }
  if (candidate.providerId === "cocoapods") return [path.join(context.homeDirectory, "Library/Caches")];
  if (candidate.providerId === "swiftpm") {
    return [path.join(context.homeDirectory, "Library/Caches")];
  }
  if (candidate.providerId === "npm") return [path.join(context.homeDirectory, ".npm/_npx")];
  if (candidate.providerId === "pnpm") return [path.join(context.homeDirectory, "Library/pnpm/store")];
  if (candidate.providerId === "node") return [path.join(context.homeDirectory, ".local/share/fnm/node-versions")];
  if (candidate.providerId === "cargo") return [path.join(context.homeDirectory, ".cargo")];
  if (candidate.providerId === "gradle") return [path.join(context.homeDirectory, ".gradle")];
  if (candidate.providerId === "android") {
    return [path.join(context.homeDirectory, ".android"), path.join(context.homeDirectory, "Library/Android/sdk")];
  }
  if (candidate.providerId === "claude") {
    return [
      path.join(context.homeDirectory, ".local/share/claude/versions"),
      path.join(context.homeDirectory, ".cache/claude/staging"),
    ];
  }
  return [
    path.join(context.homeDirectory, ".codex/packages/standalone/releases"),
    path.join(context.homeDirectory, ".codex/.tmp"),
  ];
}

function expectedNames(candidate: CleanupCandidate): ReadonlySet<string> | undefined {
  if (candidate.providerId === "projects") return PROJECT_ARTIFACT_NAMES;
  if (candidate.providerId === "cocoapods") return new Set(["CocoaPods"]);
  if (candidate.providerId === "swiftpm") return new Set(["org.swift.swiftpm"]);
  if (
    candidate.providerId === "simulator" &&
    candidate.path &&
    path.basename(candidate.path) === "Caches" &&
    path.basename(path.dirname(candidate.path)) === "CoreSimulator"
  ) {
    return new Set(["Caches"]);
  }
  return undefined;
}

export async function cleanCandidate(
  candidate: CleanupCandidate,
  context: ScanContext,
  loadPins: PinsLoader = lazyPins(context),
): Promise<CleanupResult> {
  try {
    context.signal?.throwIfAborted();
    if (context.excludedCandidateIds?.has(candidate.id)) {
      throw new Error("Item is kept out of cleanup; allow cleanup again before retrying");
    }
    await assertRuntimeStillRemovable(candidate, context, loadPins);
    if (candidate.cleanupPolicy === "command") {
      if (!candidate.command) throw new Error("Missing command specification");
      const before = candidate.path
        ? (await pathExists(candidate.path))
          ? await directorySize(candidate.path)
          : 0
        : undefined;
      const result = await runCommand(candidate.command, context.signal, context.extraPath);
      const after = candidate.path
        ? (await pathExists(candidate.path))
          ? await directorySize(candidate.path)
          : 0
        : undefined;
      return {
        candidateId: candidate.id,
        status: "cleaned",
        bytes: candidate.bytes,
        bytesReclaimed: before !== undefined && after !== undefined ? Math.max(0, before - after) : undefined,
        message: (result.stdout || result.stderr).trim().slice(0, 1_000) || "Command completed",
      };
    }

    if (!candidate.path) throw new Error("Missing cleanup path");
    await assertSafeTrashPath(candidate.path, {
      homeDirectory: context.homeDirectory,
      allowedRoots: allowedRoots(candidate, context),
      expectedNames: expectedNames(candidate),
    });
    if (candidate.modifiedAt) {
      const currentModifiedAt = await modifiedAt(candidate.path);
      if (currentModifiedAt.getTime() !== candidate.modifiedAt.getTime()) {
        throw new Error("Item changed since the scan; refresh before cleaning it");
      }
    }
    await trash(candidate.path);
    return {
      candidateId: candidate.id,
      status: "cleaned",
      bytes: candidate.bytes,
      bytesReclaimed: 0,
      message: "Moved to Trash; disk space is reclaimed after Trash is emptied",
    };
  } catch (error) {
    if (isAbortError(error) || context.signal?.aborted) {
      return { candidateId: candidate.id, status: "cancelled", message: "Cleanup cancelled" };
    }
    return { candidateId: candidate.id, status: "failed", message: (error as Error).message };
  }
}

export async function cleanCandidates(
  candidates: CleanupCandidate[],
  context: ScanContext,
  onProgress?: (completed: number, total: number) => void,
): Promise<CleanupResult[]> {
  const results: CleanupResult[] = [];
  const loadPins = lazyPins(context);
  for (const candidate of candidates) {
    if (context.signal?.aborted) {
      results.push({
        candidateId: candidate.id,
        status: "cancelled",
        bytes: candidate.bytes,
        message: "Cleanup cancelled before this item",
      });
      onProgress?.(results.length, candidates.length);
      continue;
    }
    results.push(await cleanCandidate(candidate, context, loadPins));
    onProgress?.(results.length, candidates.length);
  }
  return results;
}

/** Where the most recent scan stands; a failed or cancelled scan is `unavailable` rather than still running. */
export type LatestScan =
  { state: "scanning" } | { state: "unavailable" } | { state: "complete"; candidates: readonly CleanupCandidate[] };

export type RetryTargets =
  | { status: "scanning" }
  | { status: "unavailable" }
  | { status: "missing"; missing: CleanupCandidate[] }
  | { status: "ready"; candidates: CleanupCandidate[]; missing: CleanupCandidate[] };

/**
 * Picks failed items from the latest completed scan rather than reusing the original candidates, whose recorded
 * modification time would make an item that changed after scanning fail revalidation again. Failed items that are no
 * longer found are returned separately so the caller can report them instead of skipping them silently.
 */
export function freshRetryTargets(failed: readonly CleanupCandidate[], latestScan: LatestScan): RetryTargets {
  if (latestScan.state !== "complete") return { status: latestScan.state };
  const latestById = new Map(latestScan.candidates.map((candidate) => [candidate.id, candidate] as const));
  const candidates = failed.flatMap((candidate) => latestById.get(candidate.id) ?? []);
  const missing = failed.filter((candidate) => !latestById.has(candidate.id));
  return candidates.length > 0 ? { status: "ready", candidates, missing } : { status: "missing", missing };
}
