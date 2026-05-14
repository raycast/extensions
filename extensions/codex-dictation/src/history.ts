import { existsSync, readFileSync } from "fs";
import { getCodexPaths } from "./codex-paths";
import type { DictationEntry, LoadState } from "./types";

export function loadDictationHistory(): LoadState {
  const paths = getCodexPaths();

  try {
    if (!existsSync(paths.codexHome)) {
      return { status: "codex-missing", paths };
    }

    if (!existsSync(paths.historyPath)) {
      return { status: "history-missing", paths };
    }

    const contents = readFileSync(paths.historyPath, "utf8");
    let skippedLines = 0;
    const entries = contents
      .split("\n")
      .flatMap((line) => {
        const trimmedLine = line.trim();

        if (trimmedLine.length === 0) {
          return [];
        }

        const entry = parseDictationEntry(trimmedLine);

        if (!entry) {
          skippedLines += 1;
          return [];
        }

        return [entry];
      })
      .sort((left, right) => right.createdAtMs - left.createdAtMs);

    return { status: "loaded", entries, skippedLines, paths };
  } catch (error) {
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
    Number.isFinite(candidate.createdAtMs) &&
    typeof candidate.text === "string"
  );
}
