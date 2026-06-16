import {
  type CodexThread,
  type SetThreadNameResult,
  setThreadName,
} from "./codex-app-server";
import { generateCodexThreadTitle } from "./codex-thread-summary";
import { getErrorMessage, getThreadDisplayTitle } from "./format";

export type AutoRenameResult = {
  id: string;
  previousTitle: string;
  nextTitle: string | null;
  status: "renamed" | "skipped" | "failed";
  renameStrategy?: SetThreadNameResult["strategy"];
  directError?: string;
  error?: string;
};

// Run at most `limit` workers in parallel, preserving input-index order in results.
async function withConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function loop() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, loop),
  );
  return results;
}

const RENAME_CONCURRENCY = 3;

export async function autoRenameCodexThreads({
  archived,
  onProgress,
  threads,
}: {
  archived: boolean;
  onProgress?: (progress: {
    index: number;
    total: number;
    thread: CodexThread;
    title: string;
  }) => void;
  threads: CodexThread[];
}): Promise<AutoRenameResult[]> {
  // Tracks how many threads have completed so far for ordered progress reporting.
  let completed = 0;

  return withConcurrency(threads, RENAME_CONCURRENCY, async (thread) => {
    const previousTitle = getThreadDisplayTitle(thread);

    try {
      const titleSuggestion = await generateCodexThreadTitle(thread);
      const nextTitle = titleSuggestion.title.trim();

      if (areEquivalentThreadNames(previousTitle, nextTitle)) {
        const progressIndex = completed++;
        onProgress?.({
          index: progressIndex,
          total: threads.length,
          thread,
          title: previousTitle,
        });
        return {
          id: thread.id,
          previousTitle,
          nextTitle,
          status: "skipped",
        } satisfies AutoRenameResult;
      }

      const renameResult = await setThreadName(thread.id, nextTitle, {
        archived,
      });
      const progressIndex = completed++;
      onProgress?.({
        index: progressIndex,
        total: threads.length,
        thread,
        title: nextTitle,
      });
      return {
        id: thread.id,
        previousTitle,
        nextTitle,
        status: "renamed",
        renameStrategy: renameResult.strategy,
        directError:
          renameResult.strategy === "archivedFallback"
            ? renameResult.directError
            : undefined,
      } satisfies AutoRenameResult;
    } catch (error) {
      const progressIndex = completed++;
      onProgress?.({
        index: progressIndex,
        total: threads.length,
        thread,
        title: previousTitle,
      });
      return {
        id: thread.id,
        previousTitle,
        nextTitle: null,
        status: "failed",
        error: getErrorMessage(error),
      } satisfies AutoRenameResult;
    }
  });
}

export function buildAutoRenameReport(results: AutoRenameResult[]): string {
  const summary = buildAutoRenameReportSummary(results);
  const lines = [
    "# Codex Threads Auto Rename Report",
    "",
    "## Summary",
    `- Total: ${results.length}`,
    `- Renamed: ${summary.renamed}`,
    `- Skipped: ${summary.skipped}`,
    `- Failed: ${summary.failed}`,
    `- Direct API renames: ${summary.direct}`,
    `- Archived fallback renames: ${summary.archivedFallback}`,
    `- Raycast AI rate limits: ${summary.raycastAiRateLimits}`,
    `- App-server contract errors: ${summary.appServerContractErrors}`,
    "",
    "## Threads",
    "",
  ];

  for (const result of results) {
    const status =
      result.status === "renamed" &&
      result.renameStrategy === "archivedFallback"
        ? "RENAMED (ARCHIVED FALLBACK)"
        : result.status.toUpperCase();
    const nextTitle = result.nextTitle ? ` -> ${result.nextTitle}` : "";
    const error = result.error ? ` (${result.error})` : "";
    lines.push(`- ${status}: ${result.previousTitle}${nextTitle}`);
    lines.push(`  ${result.id}${error}`);
    if (result.directError) {
      lines.push(`  Direct thread/name/set failed: ${result.directError}`);
    }
  }

  return lines.join("\n");
}

function buildAutoRenameReportSummary(results: AutoRenameResult[]) {
  const summary = {
    renamed: 0,
    skipped: 0,
    failed: 0,
    direct: 0,
    archivedFallback: 0,
    raycastAiRateLimits: 0,
    appServerContractErrors: 0,
  };

  for (const result of results) {
    summary[result.status] += 1;

    if (result.renameStrategy === "direct") {
      summary.direct += 1;
    }

    if (result.renameStrategy === "archivedFallback") {
      summary.archivedFallback += 1;
    }

    if (isRaycastAiRateLimitMessage(result.error)) {
      summary.raycastAiRateLimits += 1;
    }

    if (
      isAppServerContractErrorMessage(result.error) ||
      isAppServerContractErrorMessage(result.directError)
    ) {
      summary.appServerContractErrors += 1;
    }
  }

  return summary;
}

function isRaycastAiRateLimitMessage(message: string | undefined): boolean {
  return Boolean(
    message?.includes("HTTP Status: 429") ||
    message?.toLowerCase().includes("rate limit"),
  );
}

function isAppServerContractErrorMessage(message: string | undefined): boolean {
  return Boolean(
    message?.includes("thread/") && message.includes("code -32600"),
  );
}

export function areEquivalentThreadNames(left: string, right: string): boolean {
  return (
    left.trim().replace(/\s+/g, " ").toLowerCase() ===
    right.trim().replace(/\s+/g, " ").toLowerCase()
  );
}
