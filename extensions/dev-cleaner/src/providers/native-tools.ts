import { opendir } from "node:fs/promises";
import path from "node:path";

import { resolveExecutable, runCommand } from "../lib/command";
import { directorySize, isOlderThan, modifiedAt, pathExists } from "../lib/fs";
import type { CleanupCandidate, CleanupProvider, ProviderId, ScanContext, ScanResult } from "../types";

interface NativeDefinition {
  providerId: ProviderId;
  section: string;
  title: string;
  executable: string;
  args: string[];
  description: string;
  risk: "safe" | "review" | "high";
  selectedByDefault: boolean;
  sizePath?: (home: string) => string;
  timeoutMs?: number;
  previewArgs?: string[];
}

const DEFINITIONS: NativeDefinition[] = [
  {
    providerId: "npm",
    section: "Package Managers",
    title: "Verify and garbage-collect npm cache",
    executable: "npm",
    args: ["cache", "verify"],
    description: "Uses npm's own cache verifier to remove unneeded content and repair the index.",
    risk: "safe",
    selectedByDefault: false,
    sizePath: (home) => path.join(home, ".npm/_cacache"),
  },
  {
    providerId: "pnpm",
    section: "Package Managers",
    title: "Prune pnpm store",
    executable: "pnpm",
    args: ["store", "prune"],
    description: "Removes packages no longer referenced by any pnpm project known to the store.",
    risk: "safe",
    selectedByDefault: false,
    sizePath: (home) => path.join(home, "Library/pnpm/store"),
  },
  {
    providerId: "uv",
    section: "Package Managers",
    title: "Prune uv cache",
    executable: "uv",
    args: ["cache", "prune"],
    description: "Removes unreachable objects using uv's native cache pruning.",
    risk: "safe",
    selectedByDefault: false,
    sizePath: (home) => path.join(home, ".cache/uv"),
  },
  {
    providerId: "homebrew",
    section: "Homebrew",
    title: "Clean downloads and old formula versions",
    executable: "brew",
    args: ["cleanup", "--prune=30"],
    description: "Uses Homebrew cleanup and preserves downloads newer than 30 days.",
    risk: "review",
    selectedByDefault: false,
    sizePath: (home) => path.join(home, "Library/Caches/Homebrew"),
    timeoutMs: 300_000,
    previewArgs: ["cleanup", "--dry-run", "--prune=30"],
  },
  {
    providerId: "docker",
    section: "Docker",
    title: "Remove unused Docker images",
    executable: "docker",
    args: ["image", "prune", "--all", "--force"],
    description: "Removes images not referenced by any container. Containers, networks, and volumes are preserved.",
    risk: "high",
    selectedByDefault: false,
    timeoutMs: 300_000,
    previewArgs: ["system", "df"],
  },
  {
    providerId: "docker",
    section: "Docker",
    title: "Prune Docker build cache",
    executable: "docker",
    args: ["builder", "prune", "--force"],
    description: "Removes unused build cache. Future builds can take longer.",
    risk: "review",
    selectedByDefault: false,
    timeoutMs: 300_000,
    previewArgs: ["system", "df"],
  },
];

async function sizeIfPresent(target?: string, signal?: AbortSignal): Promise<number | undefined> {
  if (!target || !(await pathExists(target))) return undefined;
  return directorySize(target, signal);
}

async function scanNpx(context: ScanContext): Promise<CleanupCandidate[]> {
  context.signal?.throwIfAborted();
  const npxRoot = path.join(context.homeDirectory, ".npm/_npx");
  if (!(await pathExists(npxRoot))) return [];
  const now = context.now ?? new Date();
  const directory = await opendir(npxRoot);
  const candidates: CleanupCandidate[] = [];
  for await (const entry of directory) {
    context.signal?.throwIfAborted();
    if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
    const child = path.join(npxRoot, entry.name);
    const date = await modifiedAt(child);
    if (!isOlderThan(date, 30, now)) continue;
    candidates.push({
      id: `npm:npx:${entry.name}`,
      providerId: "npm",
      section: "Package Managers",
      title: `npx workspace ${entry.name}`,
      subtitle: child,
      description: "Temporary npx workspace not modified for at least 30 days.",
      cleanupPolicy: "trash",
      risk: "safe",
      selectedByDefault: true,
      bytes: await directorySize(child, context.signal),
      modifiedAt: date,
      path: child,
    });
  }
  return candidates;
}

export class NativeToolsProvider implements CleanupProvider {
  readonly id = "npm" as const;

  async scan(context: ScanContext): Promise<ScanResult> {
    const candidates: CleanupCandidate[] = [];
    const issues: ScanResult["issues"] = [];
    const executables = new Map<string, string | undefined>();
    const previews = new Map<string, string>();

    try {
      candidates.push(...(await scanNpx(context)));
    } catch (error) {
      issues.push({ providerId: "npm", message: `npx cache: ${(error as Error).message}` });
    }

    for (const definition of DEFINITIONS) {
      context.signal?.throwIfAborted();
      try {
        let executable = executables.get(definition.executable);
        if (!executables.has(definition.executable)) {
          executable = await resolveExecutable(definition.executable, context);
          executables.set(definition.executable, executable);
        }
        if (!executable) continue;
        let sizePath = definition.sizePath?.(context.homeDirectory);
        if (definition.providerId === "pnpm") {
          const store = await runCommand(
            { executable, args: ["store", "path"], timeoutMs: 10_000 },
            context.signal,
            context.extraPath,
          );
          const activeStore = store.stdout.trim();
          sizePath = activeStore && (await pathExists(activeStore)) ? activeStore : undefined;
        }
        let preview = "";
        if (definition.previewArgs) {
          const previewKey = `${executable}\0${definition.previewArgs.join("\0")}`;
          const cachedPreview = previews.get(previewKey);
          if (cachedPreview !== undefined) preview = cachedPreview;
          else
            try {
              const result = await runCommand(
                {
                  executable,
                  args: definition.previewArgs,
                  timeoutMs: 60_000,
                },
                context.signal,
                context.extraPath,
              );
              preview = result.stdout.trim() || result.stderr.trim();
              previews.set(previewKey, preview);
            } catch (error) {
              issues.push({
                providerId: definition.providerId,
                message: `Preview failed: ${(error as Error).message}`,
              });
            }
        }
        candidates.push({
          id: `${definition.providerId}:command:${definition.args.join(":")}`,
          providerId: definition.providerId,
          section: definition.section,
          title: definition.title,
          subtitle: [executable, ...definition.args].join(" "),
          description: preview
            ? `${definition.description}\n\nPreview:\n${preview.slice(0, 2_000)}`
            : definition.description,
          cleanupPolicy: "command",
          risk: definition.risk,
          selectedByDefault: definition.selectedByDefault,
          bytes: await sizeIfPresent(sizePath, context.signal),
          path: sizePath,
          command: { executable, args: definition.args, timeoutMs: definition.timeoutMs },
        });
      } catch (error) {
        issues.push({ providerId: definition.providerId, message: (error as Error).message });
      }
    }
    return { candidates, issues };
  }
}
