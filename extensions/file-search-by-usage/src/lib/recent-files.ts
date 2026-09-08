import { Entry } from "./types";
import { readUsageMetaResult, UsageMetaResult } from "./spotlight";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { statEntryAsync } from "./directory-listing";
import { isNoisyPath } from "./read-dir";
import { matchPath, parseQuery } from "./query";
import { createReadPool } from "./bounded-reads";

export type RecentEntry = Entry & { recent?: boolean };
export type RecentScan = {
  entries: RecentEntry[];
  partial: boolean;
  reasons?: string[];
  cancelled?: boolean;
  error?: string;
};
type Options = {
  home?: string;
  signal?: AbortSignal;
  budgetMs?: number;
  metadataBudgetMs?: number;
  maxPerFolder?: number;
  maxDocuments?: number;
  maxFolders?: number;
  maxEntries?: number;
  onProgress?: (result: RecentScan) => void;
  onStatus?: (message: string) => void;
};
type Dependencies = {
  find?: (
    signal: AbortSignal,
  ) => Promise<{ paths: string[]; truncated: boolean }>;
  usage?: (
    paths: string[],
    opts: { signal: AbortSignal; timeoutMs: number },
  ) => Promise<UsageMetaResult>;
};

const exec = promisify(execFile);
const MAX_CANDIDATES = 500;
const importRead = createReadPool();

/** Spotlight last-opened query, restricted to the user's home folder. */
export async function findRecentPaths(
  home: string,
  signal: AbortSignal,
  runner: (
    file: string,
    args: string[],
    options: {
      signal: AbortSignal;
      timeout: number;
      maxBuffer: number;
      killSignal: "SIGKILL";
      encoding: "utf8";
    },
  ) => Promise<{ stdout: string }> = exec,
  timeoutMs = 15_000,
) {
  const query =
    "kMDItemLastUsedDate >= $time.now(-604800) && kMDItemLastUsedDate <= $time.now && " +
    '((kMDItemContentTypeTree == "public.content") || (kMDItemContentTypeTree == "public.archive") || (kMDItemContentTypeTree == "com.microsoft.*"cdw))';
  const { stdout } = await runner(
    "/usr/bin/mdfind",
    ["-0", "-onlyin", home, query],
    {
      signal,
      timeout: timeoutMs,
      maxBuffer: 4_000_000,
      killSignal: "SIGKILL",
      encoding: "utf8",
    },
  );
  const paths = [...new Set(stdout.split("\0").filter(Boolean))];
  return {
    paths: paths.slice(0, MAX_CANDIDATES),
    truncated: paths.length > MAX_CANDIDATES,
  };
}

function allowed(full: string, home: string): boolean {
  const relative = path.relative(home, full);
  return (
    path.isAbsolute(full) &&
    full === path.normalize(full) &&
    relative !== "" &&
    relative !== ".." &&
    !relative.startsWith("../") &&
    !path.isAbsolute(relative) &&
    !path.basename(full).startsWith(".") &&
    !isNoisyPath(full + "/_", home, false)
  );
}

/** Reads names and metadata only; no file contents or recursive folder traversal. */
export async function scanRecentFiles(
  options: Options = {},
  dependencies: Dependencies = {},
): Promise<RecentScan> {
  const {
    home = os.homedir(),
    budgetMs = 15_000,
    metadataBudgetMs = 2500,
    maxPerFolder = 200,
    maxDocuments = 200,
    maxFolders = 20,
    maxEntries = 3000,
  } = options;
  const controller = new AbortController();
  const abort = () => controller.abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  if (options.signal?.aborted) abort();
  const timer = setTimeout(abort, budgetMs);
  const entries = new Map<string, RecentEntry>();
  let partial = false;
  const reasons = new Set<string>();
  const markPartial = (reason: string) => {
    partial = true;
    reasons.add(reason);
  };
  const snapshot = (): RecentScan => ({
    entries: [...entries.values()],
    partial,
    reasons: [...reasons],
  });
  // A provider read may outlive cancellation, but cannot publish or write afterward.
  const bounded = async <T>(work: () => Promise<T>): Promise<T> => {
    if (controller.signal.aborted) throw new Error("Import stopped");
    let stop!: () => void;
    const interrupted = new Promise<never>((_, reject) => {
      stop = () => reject(new Error("Import stopped"));
      controller.signal.addEventListener("abort", stop, { once: true });
    });
    try {
      return await Promise.race([work(), interrupted]);
    } finally {
      controller.signal.removeEventListener("abort", stop);
    }
  };
  const add = (entry: RecentEntry) => {
    if (entries.has(entry.path)) return;
    if (entries.size >= maxEntries) {
      markPartial(`reached the ${maxEntries}-item cache limit`);
      return;
    }
    entries.set(entry.path, entry);
  };
  const read = <T>(work: () => Promise<T>) =>
    importRead(Symbol(), work, controller.signal);
  try {
    const realHome = await read(() => fs.realpath(home));
    const checkedStat = async (full: string, allowHome = false) => {
      try {
        const resolved = await fs.realpath(full);
        if (controller.signal.aborted) return undefined;
        if (
          !(allowHome && full === home && resolved === realHome) &&
          !allowed(resolved, realHome)
        )
          return undefined;
        return statEntryAsync(full, controller.signal);
      } catch {
        return undefined;
      }
    };
    options.onStatus?.("Finding recently opened documents in Spotlight");
    const found = await bounded(() =>
      (
        dependencies.find ??
        ((signal) => findRecentPaths(home, signal, exec, budgetMs))
      )(controller.signal),
    );
    if (found.truncated)
      markPartial(`Spotlight returned more than ${MAX_CANDIDATES} candidates`);
    const candidates = [...new Set(found.paths)]
      .filter((p) => allowed(p, home))
      .slice(0, MAX_CANDIDATES);
    options.onStatus?.(
      `Reading last-opened metadata for ${candidates.length} documents`,
    );
    const usage = candidates.length
      ? await bounded(() =>
          (dependencies.usage ?? readUsageMetaResult)(candidates, {
            signal: controller.signal,
            timeoutMs: Math.min(metadataBudgetMs, budgetMs),
          }),
        )
      : { meta: new Map(), complete: true };
    if (!usage.complete)
      markPartial("some last-opened metadata was unavailable or timed out");
    candidates.sort(
      (a, b) =>
        (usage.meta.get(b)?.lastUsedMs ?? 0) -
        (usage.meta.get(a)?.lastUsedMs ?? 0),
    );
    if (candidates.length > maxDocuments)
      markPartial(`reached the ${maxDocuments}-document limit`);
    for (let i = 0; i < Math.min(candidates.length, maxDocuments); i += 8) {
      options.onStatus?.(
        `Checking documents ${i + 1}–${Math.min(i + 8, candidates.length, maxDocuments)} of ${Math.min(candidates.length, maxDocuments)}`,
      );
      const batch = await bounded(() =>
        Promise.all(
          candidates
            .slice(i, Math.min(i + 8, maxDocuments))
            .map((full) => read(() => checkedStat(full))),
        ),
      );
      for (const entry of batch) {
        if (
          !entry ||
          entry.isDirectory ||
          (entry.storagePath && !allowed(entry.storagePath, realHome))
        )
          continue;
        add({ ...entry, ...usage.meta.get(entry.path), recent: true });
      }
      options.onProgress?.(snapshot());
    }
    const parents = [
      ...new Set([...entries.keys()].map((p) => path.dirname(p))),
    ].filter((p) => p === home || allowed(p, home));
    if (parents.length > maxFolders)
      markPartial(`reached the ${maxFolders}-parent-folder limit`);
    for (const parent of parents.slice(0, maxFolders)) {
      options.onStatus?.(
        `Reading parent folder ${parents.indexOf(parent) + 1} of ${Math.min(parents.length, maxFolders)} · ${entries.size} items found`,
      );
      if (entries.size >= maxEntries) {
        markPartial(`reached the ${maxEntries}-item cache limit`);
        break;
      }
      const parentEntry = await read(() => checkedStat(parent, true));
      if (!parentEntry) {
        markPartial("some parent folders could not be read");
        continue;
      }
      add(parentEntry);
      // opendir avoids allocating every entry in a very large folder.
      const readNames = async () => {
        const names: string[] = [];
        const dir = await fs.opendir(parent);
        if (controller.signal.aborted) {
          await dir.close();
          return names;
        }
        for await (const entry of dir) {
          if (controller.signal.aborted) break;
          const full = path.join(parent, entry.name);
          if (entry.isSymbolicLink() || !allowed(full, home)) continue;
          names.push(full);
          if (names.length > maxPerFolder) break;
        }
        return names;
      };
      let names: string[];
      try {
        names = await read(readNames);
      } catch (error) {
        if (controller.signal.aborted) throw error;
        markPartial("some parent folders could not be read");
        continue;
      }
      if (names.length > maxPerFolder)
        markPartial(`reached the ${maxPerFolder}-items-per-folder limit`);
      const selected = names.slice(
        0,
        Math.min(maxPerFolder, maxEntries - entries.size),
      );
      if (selected.length < Math.min(names.length, maxPerFolder))
        markPartial(`reached the ${maxEntries}-item cache limit`);
      for (let i = 0; i < selected.length; i += 8) {
        const batch = await bounded(() =>
          Promise.all(
            selected
              .slice(i, i + 8)
              .map((full) => read(() => checkedStat(full))),
          ),
        );
        for (const entry of batch) {
          if (!entry) {
            markPartial("some file metadata could not be read");
            continue;
          }
          if (entry.storagePath && !allowed(entry.storagePath, realHome))
            continue;
          add(entry);
        }
      }
      options.onProgress?.(snapshot());
    }
    return snapshot();
  } catch {
    if (options.signal?.aborted) return { ...snapshot(), cancelled: true };
    if (controller.signal.aborted) {
      markPartial("the recent-file scan reached its time limit");
      return snapshot();
    }
    return {
      ...snapshot(),
      error: "Recent files could not be read from Spotlight.",
    };
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

/** Only genuinely recent documents seed the empty-query list. */
export function selectRecentEntries(
  entries: RecentEntry[],
  query: string,
  scope: string | undefined,
  showHidden: boolean,
  canonicalScope?: string,
): RecentEntry[] {
  const parsed = parseQuery(query);
  return entries
    .filter((entry) => {
      if (scope) {
        if (
          path.dirname(entry.path) !== scope &&
          path.dirname(entry.storagePath ?? entry.path) !==
            (canonicalScope ?? scope)
        )
          return false;
      }
      if (!showHidden && path.basename(entry.path).startsWith("."))
        return false;
      if (query === "" && !entry.recent) return false;
      return matchPath(parsed, entry.path) !== undefined;
    })
    .sort(
      (a, b) =>
        (matchPath(parsed, a.path) ?? 0) - (matchPath(parsed, b.path) ?? 0) ||
        (b.lastUsedMs ?? 0) - (a.lastUsedMs ?? 0),
    );
}
