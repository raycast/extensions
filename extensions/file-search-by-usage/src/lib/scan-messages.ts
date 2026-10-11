import { IndexRoot, openIndexForRead, readIndexRoots } from "./index-db";

export type ScanMessage = {
  id: string;
  root?: string;
  recordedAt?: number;
  message: string;
};
export type ScanMessages = {
  status: "ready" | "missing" | "failed";
  unfinished?: boolean;
  messages: ScanMessage[];
};

/** Read only small diagnostic tables, even when search FTS is suspended. */
export function readScanMessages(file: string): ScanMessages {
  const opened = openIndexForRead(file, 50);
  if (opened.kind === "missing") return { status: "missing", messages: [] };
  if (opened.kind === "failed")
    return {
      status: "failed",
      messages: [{ id: "read-error", message: opened.error }],
    };
  try {
    // One snapshot keeps root notes and scan timestamps consistent with each other.
    opened.db.exec("BEGIN");
    const meta = Object.fromEntries(
      (
        opened.db
          .prepare(
            "SELECT key, value FROM index_meta WHERE key IN ('last_started_at', 'last_ended_at', 'last_scan_error', 'scan_outcomes_version')",
          )
          .all() as { key: string; value: string }[]
      ).map(({ key, value }) => [key, value]),
    );
    const started = Number(meta.last_started_at);
    const ended = Number(meta.last_ended_at);
    const messages: ScanMessage[] = [];
    if (meta.last_scan_error)
      messages.push({
        id: "build-error",
        recordedAt: ended > 0 ? ended : started > 0 ? started : undefined,
        message: meta.last_scan_error,
      });
    // New scan diagnostics are a complete snapshot of outcomes recorded so far,
    // not patches to coverage notes. Offline aliases can use different root
    // spellings than old canonical coverage, so merging by path is unsafe.
    const hasOutcomes = opened.db
      .prepare(
        "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'index_scan_outcomes'",
      )
      .get();
    let outcomes: Pick<
      IndexRoot,
      "root" | "scannedAt" | "complete" | "note"
    >[] = [];
    if (hasOutcomes) {
      outcomes = opened.db
        .prepare(
          "SELECT root, recorded_at AS scannedAt, complete, note FROM index_scan_outcomes ORDER BY root",
        )
        .all() as {
        root: string;
        scannedAt: number;
        complete: number;
        note: string | null;
      }[];
    }
    if (
      meta.scan_outcomes_version &&
      (meta.scan_outcomes_version !== "1" || !hasOutcomes)
    ) {
      throw new Error(
        "Saved scan diagnostics could not be read. Rebuild the search index.",
      );
    }
    // Non-empty outcomes also cover indexes written before the snapshot marker
    // was introduced. A newly created but unused table still permits fallback.
    const roots =
      meta.scan_outcomes_version === "1" || outcomes.length > 0
        ? outcomes
        : readIndexRoots(opened.db);
    for (const root of roots) {
      if (root.complete && !root.note) continue;
      messages.push({
        id: `root:${root.root}`,
        root: root.root,
        recordedAt: root.scannedAt,
        message:
          root.note ||
          "This folder was only partly scanned; saved paths were kept.",
      });
    }
    return {
      status: "ready",
      unfinished: started > 0 && !(ended > 0),
      messages,
    };
  } catch (error) {
    return {
      status: "failed",
      messages: [
        {
          id: "read-error",
          message: error instanceof Error ? error.message : String(error),
        },
      ],
    };
  } finally {
    opened.db.close();
  }
}

/** Indented Markdown prevents paths and fd output from being interpreted as markup. */
export function scanMessageText(item: ScanMessage): string {
  return [
    item.root ?? "Index rebuild",
    item.recordedAt ? new Date(item.recordedAt).toLocaleString() : undefined,
    item.message,
  ]
    .filter((line) => line !== undefined)
    .join("\n\n");
}

export function scanMessageMarkdown(item: ScanMessage): string {
  return scanMessageText(item)
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}
