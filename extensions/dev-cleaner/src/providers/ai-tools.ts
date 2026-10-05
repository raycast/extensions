import { lstat, opendir, realpath } from "node:fs/promises";
import path from "node:path";

import { directorySize, isOlderThan, modifiedAt, pathExists } from "../lib/fs";
import type { CleanupCandidate, CleanupProvider, ProtectedItem, ProviderId, ScanContext, ScanResult } from "../types";

function versionParts(name: string): number[] {
  return (name.match(/\d+/g) ?? []).map(Number);
}

export function compareVersionNames(left: string, right: string): number {
  const a = versionParts(left);
  const b = versionParts(right);
  const length = Math.max(a.length, b.length);
  for (let index = 0; index < length; index += 1) {
    const difference = (a[index] ?? 0) - (b[index] ?? 0);
    if (difference !== 0) return difference;
  }
  return left.localeCompare(right);
}

interface VersionScannerOptions {
  providerId: ProviderId;
  section: string;
  versionsDirectory: string;
  currentLink: string;
  signal?: AbortSignal;
}

async function scanVersions(
  options: VersionScannerOptions,
): Promise<{ candidates: CleanupCandidate[]; protectedItems: ProtectedItem[] }> {
  options.signal?.throwIfAborted();
  if (!(await pathExists(options.versionsDirectory)) || !(await pathExists(options.currentLink))) {
    return { candidates: [], protectedItems: [] };
  }

  const current = await realpath(options.currentLink);
  const directory = await opendir(options.versionsDirectory);
  const versions: { name: string; path: string }[] = [];
  for await (const entry of directory) {
    options.signal?.throwIfAborted();
    if (!entry.isDirectory() && !entry.isFile()) continue;
    versions.push({ name: entry.name, path: path.join(options.versionsDirectory, entry.name) });
  }
  versions.sort((a, b) => compareVersionNames(b.name, a.name));

  const currentName = path.basename(current);
  const currentIndex = versions.findIndex((version) => version.name === currentName);
  const protectedPaths = new Set<string>([currentName]);
  const protectionReasons = new Map<string, string>([[currentName, "Current installed version"]]);
  const newest = versions[0];
  if (newest) {
    protectedPaths.add(newest.name);
    if (newest.name !== currentName) protectionReasons.set(newest.name, "Newest installed version");
  }
  const previous = currentIndex >= 0 ? versions[currentIndex + 1] : versions[0];
  if (previous) {
    protectedPaths.add(previous.name);
    if (!protectionReasons.has(previous.name)) protectionReasons.set(previous.name, "Newest rollback version");
  }

  return {
    candidates: await Promise.all(
      versions
        .filter((version) => !protectedPaths.has(version.name))
        .map(async (version) => ({
          id: `${options.providerId}:version:${version.name}`,
          providerId: options.providerId,
          section: options.section,
          title: `${version.name} (old version)`,
          subtitle: version.path,
          description: "The current version and one rollback version are protected.",
          cleanupPolicy: "trash" as const,
          risk: "safe" as const,
          selectedByDefault: true,
          bytes: await directorySize(version.path, options.signal),
          modifiedAt: await modifiedAt(version.path),
          path: version.path,
        })),
    ),
    protectedItems: versions
      .filter((version) => protectedPaths.has(version.name))
      .map((version) => ({
        id: `${options.providerId}:protected:${version.name}`,
        providerId: options.providerId,
        title: version.name,
        reason: protectionReasons.get(version.name) ?? "Protected installed version",
        path: version.path,
      })),
  };
}

async function scanStaleChildren(
  providerId: ProviderId,
  section: string,
  directoryPath: string,
  now: Date,
  signal?: AbortSignal,
): Promise<CleanupCandidate[]> {
  signal?.throwIfAborted();
  if (!(await pathExists(directoryPath))) return [];
  const directory = await opendir(directoryPath);
  const candidates: CleanupCandidate[] = [];
  for await (const entry of directory) {
    signal?.throwIfAborted();
    const child = path.join(directoryPath, entry.name);
    if ((await lstat(child)).isSymbolicLink()) continue;
    const date = await modifiedAt(child);
    if (!isOlderThan(date, 7, now)) continue;
    candidates.push({
      id: `${providerId}:temporary:${entry.name}`,
      providerId,
      section,
      title: entry.name,
      subtitle: child,
      description: "Temporary data not modified for at least 7 days.",
      cleanupPolicy: "trash",
      risk: "safe",
      selectedByDefault: true,
      bytes: await directorySize(child, signal),
      modifiedAt: date,
      path: child,
    });
  }
  return candidates;
}

export class AiToolsProvider implements CleanupProvider {
  readonly id = "codex" as const;

  async scan(context: ScanContext): Promise<ScanResult> {
    const now = context.now ?? new Date();
    const codexRoot = path.join(context.homeDirectory, ".codex");
    const claudeInstallRoot = path.join(context.homeDirectory, ".local/share/claude");
    const sources: {
      providerId: ProviderId;
      scan: () => Promise<{ candidates: CleanupCandidate[]; protectedItems: ProtectedItem[] }>;
    }[] = [
      {
        providerId: "codex",
        scan: () =>
          scanVersions({
            providerId: "codex",
            section: "Codex",
            versionsDirectory: path.join(codexRoot, "packages/standalone/releases"),
            currentLink: path.join(codexRoot, "packages/standalone/current"),
            signal: context.signal,
          }),
      },
      {
        providerId: "codex",
        scan: async () => ({
          candidates: await scanStaleChildren("codex", "Codex", path.join(codexRoot, ".tmp"), now, context.signal),
          protectedItems: [],
        }),
      },
      {
        providerId: "claude",
        scan: () =>
          scanVersions({
            providerId: "claude",
            section: "Claude Code",
            versionsDirectory: path.join(claudeInstallRoot, "versions"),
            currentLink: path.join(context.homeDirectory, ".local/bin/claude"),
            signal: context.signal,
          }),
      },
      {
        providerId: "claude",
        scan: async () => ({
          candidates: await scanStaleChildren(
            "claude",
            "Claude Code",
            path.join(context.homeDirectory, ".cache/claude/staging"),
            now,
            context.signal,
          ),
          protectedItems: [],
        }),
      },
    ];
    const results = await Promise.allSettled(sources.map((source) => source.scan()));
    context.signal?.throwIfAborted();
    return {
      candidates: results.flatMap((result) => (result.status === "fulfilled" ? result.value.candidates : [])),
      protectedItems: results.flatMap((result) => (result.status === "fulfilled" ? result.value.protectedItems : [])),
      issues: results.flatMap((result, index) =>
        result.status === "rejected"
          ? [{ providerId: sources[index].providerId, message: (result.reason as Error).message }]
          : [],
      ),
    };
  }
}
