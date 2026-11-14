import { createReadStream } from "fs";
import { stat } from "fs/promises";
import { createInterface } from "readline";
import { getCodexPaths, type CodexPaths } from "./codex-paths";
import type { DictationEntry, LoadState } from "./types";

const MAX_ENTRIES = 1_000;

export async function loadDictationHistory(
  paths: CodexPaths = getCodexPaths(),
  signal?: AbortSignal,
): Promise<LoadState> {
  try {
    const input = createReadStream(paths.historyPath, {
      encoding: "utf8",
      signal,
    });
    const lines = createInterface({ input, crlfDelay: Infinity });
    const entries: DictationEntry[] = [];
    let skippedLines = 0;

    try {
      for await (const line of lines) {
        const trimmedLine = line.trim();
        if (trimmedLine.length === 0) continue;

        const entry = parseDictationEntry(trimmedLine);
        if (!entry) {
          skippedLines += 1;
          continue;
        }

        entries.push(entry);
        // Bound retained entries even for imported histories, without assuming file order.
        if (entries.length === MAX_ENTRIES * 2) {
          entries.sort((left, right) => right.createdAtMs - left.createdAtMs);
          entries.length = MAX_ENTRIES;
        }
      }
    } finally {
      lines.close();
      input.destroy();
    }

    entries.sort((left, right) => right.createdAtMs - left.createdAtMs);
    entries.length = Math.min(entries.length, MAX_ENTRIES);

    return { status: "loaded", entries, skippedLines, paths };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      try {
        await stat(paths.codexHome);
        return { status: "history-missing", paths };
      } catch (homeError) {
        if (
          homeError instanceof Error &&
          "code" in homeError &&
          homeError.code === "ENOENT"
        ) {
          return { status: "codex-missing", paths };
        }
      }
    }
    return {
      status: "error",
      paths,
      message: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function parseDictationEntry(line: string): DictationEntry | null {
  try {
    const value = JSON.parse(line) as unknown;

    if (!isDictationEntry(value)) {
      return null;
    }

    return value;
  } catch {
    return null;
  }
}

function isDictationEntry(value: unknown): value is DictationEntry {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<DictationEntry>;

  return (
    typeof candidate.id === "string" &&
    typeof candidate.createdAtMs === "number" &&
    Number.isFinite(new Date(candidate.createdAtMs).getTime()) &&
    typeof candidate.text === "string"
  );
}
