import { trash } from "@raycast/api";
import path from "node:path";

import { runCommand } from "./lib/command";
import { directorySize, modifiedAt, pathExists } from "./lib/fs";
import { isAbortError } from "./lib/async";
import { assertSafeTrashPath, PROJECT_ARTIFACT_NAMES } from "./lib/path-safety";
import type { CleanupCandidate, CleanupResult, ScanContext } from "./types";

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

export async function cleanCandidate(candidate: CleanupCandidate, context: ScanContext): Promise<CleanupResult> {
  try {
    context.signal?.throwIfAborted();
    if (context.excludedCandidateIds?.has(candidate.id)) {
      throw new Error("Item is kept out of cleanup; allow cleanup again before retrying");
    }
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
    results.push(await cleanCandidate(candidate, context));
    onProgress?.(results.length, candidates.length);
  }
  return results;
}
