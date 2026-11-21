import type { CodexPaths } from "./codex-paths";

export type DictationEntry = {
  id: string;
  createdAtMs: number;
  text: string;
};

export type LoadState =
  | { status: "loading" }
  | {
      status: "loaded";
      entries: DictationEntry[];
      skippedLines: number;
      paths: CodexPaths;
    }
  | { status: "codex-missing"; paths: CodexPaths }
  | { status: "history-missing"; paths: CodexPaths }
  | { status: "error"; message: string; paths: CodexPaths };
