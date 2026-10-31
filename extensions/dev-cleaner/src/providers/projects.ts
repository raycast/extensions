import { lstat, opendir, realpath } from "node:fs/promises";
import path from "node:path";

import { mapWithConcurrency } from "../lib/async";
import { directorySize } from "../lib/fs";
import { PROJECT_ARTIFACT_NAMES } from "../lib/path-safety";
import type { CleanupCandidate, CleanupProvider, ScanContext, ScanResult } from "../types";

const SKIPPED_DIRECTORIES = new Set([".git", ".hg", ".svn", "Library"]);
const MAX_DEPTH = 8;

async function scanRoot(root: string, signal?: AbortSignal): Promise<CleanupCandidate[]> {
  const canonicalRoot = await realpath(root);
  const artifacts: { name: string; path: string; modifiedAt: Date }[] = [];

  async function visit(directoryPath: string, depth: number): Promise<void> {
    signal?.throwIfAborted();
    if (depth > MAX_DEPTH) return;
    const directory = await opendir(directoryPath);
    for await (const entry of directory) {
      if (!entry.isDirectory() || entry.isSymbolicLink() || SKIPPED_DIRECTORIES.has(entry.name)) continue;
      const child = path.join(directoryPath, entry.name);
      if (PROJECT_ARTIFACT_NAMES.has(entry.name)) {
        const stats = await lstat(child);
        artifacts.push({ name: entry.name, path: child, modifiedAt: stats.mtime });
        continue;
      }
      if (entry.name.startsWith(".")) continue;
      await visit(child, depth + 1);
    }
  }

  await visit(canonicalRoot, 0);
  return mapWithConcurrency(
    artifacts,
    4,
    async (artifact): Promise<CleanupCandidate> => ({
      id: `projects:${artifact.path}`,
      providerId: "projects",
      section: "Project Artifacts",
      title: artifact.name,
      subtitle: artifact.path,
      description: "Generated project data. Review the project before moving it to Trash.",
      cleanupPolicy: "trash",
      risk: "review",
      selectedByDefault: false,
      bytes: await directorySize(artifact.path, signal),
      modifiedAt: artifact.modifiedAt,
      path: artifact.path,
    }),
    signal,
  );
}

export class ProjectArtifactsProvider implements CleanupProvider {
  readonly id = "projects" as const;

  async scan(context: ScanContext): Promise<ScanResult> {
    const results = await mapWithConcurrency(
      context.projectRoots,
      2,
      async (root) => {
        try {
          return { candidates: await scanRoot(root, context.signal), issue: undefined };
        } catch (error) {
          context.signal?.throwIfAborted();
          return { candidates: [], issue: `${root}: ${(error as Error).message}` };
        }
      },
      context.signal,
    );
    const candidates = [
      ...new Map(results.flatMap((result) => result.candidates).map((candidate) => [candidate.id, candidate])).values(),
    ];
    return {
      candidates,
      issues: results.flatMap((result) => (result.issue ? [{ providerId: this.id, message: result.issue }] : [])),
    };
  }
}
