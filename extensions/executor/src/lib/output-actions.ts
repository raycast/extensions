import { Clipboard, environment, showInFinder } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ConfirmationDetails } from "./ai-tools";

export type OutputOperation = "copy-text" | "copy-json" | "export-json";

export interface OutputActionInput {
  operation: OutputOperation;
  content: string;
}

interface ExportOptions {
  supportPath?: string;
  reveal?: (path: string) => Promise<void>;
  id?: () => string;
}

function operation(input: OutputActionInput): OutputOperation {
  if (!["copy-text", "copy-json", "export-json"].includes(input.operation)) {
    throw new Error("Operation must be copy-text, copy-json, or export-json.");
  }
  return input.operation;
}

export function prettyJson(content: string): string {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    throw new Error("Content must be valid JSON.");
  }
  return JSON.stringify(value, null, 2);
}

function preparedContent(input: OutputActionInput): string {
  return operation(input) === "copy-text" ? input.content : prettyJson(input.content);
}

export function outputActionConfirmation(input: OutputActionInput): ConfirmationDetails {
  const content = preparedContent(input);
  return {
    message:
      input.operation === "copy-text"
        ? "Copy this exact text to the clipboard?"
        : input.operation === "copy-json"
          ? "Copy this exact formatted JSON to the clipboard?"
          : "Export this exact formatted JSON to Executor's private exports directory?",
    info: [
      { name: "Operation", value: input.operation },
      { name: input.operation === "copy-text" ? "Text" : "Formatted JSON", value: content },
    ],
  };
}

export async function exportResultJson(content: string, options: ExportOptions = {}) {
  const formatted = prettyJson(content);
  const directory = join(options.supportPath ?? environment.supportPath, "exports");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await chmod(directory, 0o700);
  const path = join(directory, `executor-result-${(options.id ?? randomUUID)()}.json`);
  await writeFile(path, formatted, { mode: 0o600, flag: "wx" });

  try {
    await (options.reveal ?? showInFinder)(path);
    return { exported: true as const, path, revealed: true as const };
  } catch (error) {
    return {
      exported: true as const,
      path,
      revealed: false as const,
      revealUnavailable: error instanceof Error ? error.message : "Finder could not reveal the exported file.",
    };
  }
}

export async function performOutputAction(input: OutputActionInput) {
  const content = preparedContent(input);
  if (input.operation === "export-json") return exportResultJson(content);
  await Clipboard.copy(content);
  return {
    copied: true as const,
    operation: input.operation,
    characters: content.length,
  };
}
