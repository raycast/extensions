import { opendir } from "node:fs/promises";
import path from "node:path";

import { directorySize, modifiedAt, pathExists } from "../lib/fs";
import type { CleanupCandidate, CleanupProvider, ProviderId, ScanContext, ScanResult } from "../types";

interface CacheDefinition {
  providerId: ProviderId;
  section: string;
  title: string;
  path: string;
  description: string;
  risk: "safe" | "review" | "high";
  children?: boolean;
}

async function candidateFor(
  definition: CacheDefinition,
  candidatePath: string,
  title: string,
  signal?: AbortSignal,
): Promise<CleanupCandidate | undefined> {
  signal?.throwIfAborted();
  if (!(await pathExists(candidatePath))) return undefined;
  const bytes = await directorySize(candidatePath, signal);
  if (bytes === 0) return undefined;
  return {
    id: `${definition.providerId}:cache:${candidatePath}`,
    providerId: definition.providerId,
    section: definition.section,
    title,
    subtitle: candidatePath,
    description: definition.description,
    cleanupPolicy: "trash",
    risk: definition.risk,
    selectedByDefault: false,
    bytes,
    modifiedAt: await modifiedAt(candidatePath),
    path: candidatePath,
  };
}

export class AppleCachesProvider implements CleanupProvider {
  readonly id = "simulator" as const;

  async scan(context: ScanContext): Promise<ScanResult> {
    const home = context.homeDirectory;
    const definitions: CacheDefinition[] = [
      {
        providerId: "simulator",
        section: "Apple Developer Caches",
        title: "CoreSimulator caches",
        path: path.join(home, "Library/Developer/CoreSimulator/Caches"),
        description: "Regenerable Simulator service caches. Quit Simulator and Xcode before cleanup.",
        risk: "review",
      },
      {
        providerId: "simulator",
        section: "Apple Developer Caches",
        title: "iOS DeviceSupport",
        path: path.join(home, "Library/Developer/Xcode/iOS DeviceSupport"),
        description: "Symbols and support files for an iOS version. Xcode may need to prepare them again.",
        risk: "high",
        children: true,
      },
      {
        providerId: "cocoapods",
        section: "Apple Developer Caches",
        title: "CocoaPods cache",
        path: path.join(home, "Library/Caches/CocoaPods"),
        description: "Downloaded CocoaPods artifacts. Future pod installs may download them again.",
        risk: "review",
      },
      {
        providerId: "swiftpm",
        section: "Apple Developer Caches",
        title: "SwiftPM cache",
        path: path.join(home, "Library/Caches/org.swift.swiftpm"),
        description: "Downloaded Swift package metadata and artifacts that can be regenerated.",
        risk: "review",
      },
    ];
    const candidates: CleanupCandidate[] = [];
    const issues: ScanResult["issues"] = [];
    for (const definition of definitions) {
      try {
        if (!(await pathExists(definition.path))) continue;
        if (!definition.children) {
          const candidate = await candidateFor(definition, definition.path, definition.title, context.signal);
          if (candidate) candidates.push(candidate);
          continue;
        }
        const directory = await opendir(definition.path);
        for await (const entry of directory) {
          context.signal?.throwIfAborted();
          if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
          const child = path.join(definition.path, entry.name);
          const candidate = await candidateFor(definition, child, `${definition.title} ${entry.name}`, context.signal);
          if (candidate) candidates.push(candidate);
        }
      } catch (error) {
        context.signal?.throwIfAborted();
        issues.push({ providerId: definition.providerId, message: (error as Error).message });
      }
    }
    return { candidates, issues };
  }
}
