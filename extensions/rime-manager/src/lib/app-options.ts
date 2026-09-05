import YAML from "yaml";

import type { AppOption } from "../types";
import { ensureTrailingNewline, normalizeLineEndings, yamlString } from "./text";

const OPTION_KEYS = ["ascii_mode", "ascii_punct", "inline", "vim_mode"] as const;
type OptionKey = (typeof OPTION_KEYS)[number];

function toBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function parseApplicationOptions(source: string): AppOption[] {
  let document: unknown;
  try {
    document = YAML.parse(source);
  } catch {
    return [];
  }

  const patch = (document as { patch?: Record<string, unknown> } | undefined)?.patch;
  if (!patch || typeof patch !== "object") return [];

  const result = new Map<string, AppOption>();
  const nested = patch.app_options;
  if (nested && typeof nested === "object" && !Array.isArray(nested)) {
    for (const [bundleId, rawOptions] of Object.entries(nested as Record<string, unknown>)) {
      if (!rawOptions || typeof rawOptions !== "object" || Array.isArray(rawOptions)) continue;
      const options = rawOptions as Record<string, unknown>;
      result.set(bundleId, {
        bundleId,
        asciiMode: toBoolean(options.ascii_mode),
        asciiPunct: toBoolean(options.ascii_punct),
        inline: toBoolean(options.inline),
        vimMode: toBoolean(options.vim_mode),
      });
    }
  }

  for (const [key, rawOptions] of Object.entries(patch)) {
    if (!key.startsWith("app_options/") || !rawOptions || typeof rawOptions !== "object" || Array.isArray(rawOptions)) {
      continue;
    }
    const bundleId = key.slice("app_options/".length);
    const options = rawOptions as Record<string, unknown>;
    result.set(bundleId, {
      bundleId,
      asciiMode: toBoolean(options.ascii_mode),
      asciiPunct: toBoolean(options.ascii_punct),
      inline: toBoolean(options.inline),
      vimMode: toBoolean(options.vim_mode),
    });
  }

  return [...result.values()].sort((a, b) => a.bundleId.localeCompare(b.bundleId));
}

function indentation(line: string): number {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function unquoteYamlKey(value: string): string {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) {
    try {
      return YAML.parse(trimmed) as string;
    } catch {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

type LocatedBlock = { start: number; end: number; keyIndent: number };

function locateApplicationBlock(lines: string[], bundleId: string): LocatedBlock | undefined {
  for (let index = 0; index < lines.length; index += 1) {
    const direct = lines[index].match(/^\s{2}(["']?app_options\/[^:]+["']?):\s*(?:\{.*\})?\s*(?:#.*)?$/);
    if (direct && unquoteYamlKey(direct[1]) === `app_options/${bundleId}`) {
      let end = index + 1;
      while (end < lines.length && (lines[end].trim() === "" || indentation(lines[end]) > 2)) end += 1;
      return { start: index, end, keyIndent: 2 };
    }
  }

  const appOptionsIndex = lines.findIndex((line) => /^\s{2}app_options:\s*(?:#.*)?$/.test(line));
  if (appOptionsIndex < 0) return undefined;

  let sectionEnd = appOptionsIndex + 1;
  while (sectionEnd < lines.length && (lines[sectionEnd].trim() === "" || indentation(lines[sectionEnd]) > 2)) {
    sectionEnd += 1;
  }

  for (let index = appOptionsIndex + 1; index < sectionEnd; index += 1) {
    const match = lines[index].match(/^\s{4}([^#][^:]*):\s*(?:\{.*\})?\s*(?:#.*)?$/);
    if (!match || unquoteYamlKey(match[1]) !== bundleId) continue;
    let end = index + 1;
    while (end < sectionEnd && (lines[end].trim() === "" || indentation(lines[end]) > 4)) end += 1;
    return { start: index, end, keyIndent: 4 };
  }
  return undefined;
}

function expandInlineOptions(lines: string[], block: LocatedBlock): void {
  const line = lines[block.start];
  const match = line.match(/^(\s*[^#][^:]*:)\s*(\{.*\})(\s*#.*)?$/);
  if (!match) return;

  let options: Record<string, unknown> = {};
  try {
    const parsed = YAML.parse(match[2]);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) options = parsed as Record<string, unknown>;
  } catch {
    throw new Error("The selected app uses an inline YAML value that could not be parsed. No changes were made.");
  }

  const optionLines = Object.entries(options).map(
    ([key, value]) =>
      `${" ".repeat(block.keyIndent + 2)}${key}: ${typeof value === "string" ? JSON.stringify(value) : String(value)}`,
  );
  lines.splice(block.start, 1, `${match[1]}${match[3] ?? ""}`, ...optionLines);
}

function formatOption(key: OptionKey, value: boolean, indent: number): string {
  return `${" ".repeat(indent)}${key}: ${value ? "true" : "false"}`;
}

export type ApplicationOptionUpdate = Partial<Record<OptionKey, boolean | undefined>>;

export function updateApplicationOptions(source: string, bundleId: string, update: ApplicationOptionUpdate): string {
  const normalized = ensureTrailingNewline(normalizeLineEndings(source || "patch:\n"));
  const lines = normalized.replace(/\n$/, "").split("\n");
  const patchIndex = lines.findIndex((line) => /^patch:\s*(?:#.*)?$/.test(line));
  if (patchIndex < 0) throw new Error("No top-level patch: key was found in squirrel.custom.yaml.");

  let block = locateApplicationBlock(lines, bundleId);
  if (!block) {
    const additions = Object.entries(update).filter(
      (entry): entry is [OptionKey, boolean] => typeof entry[1] === "boolean",
    );
    if (additions.length === 0) return normalized;
    const newLines = [
      `  ${yamlString(`app_options/${bundleId}`)}:`,
      ...additions.map(([key, value]) => formatOption(key, value, 4)),
    ];
    lines.splice(patchIndex + 1, 0, ...newLines);
    return ensureTrailingNewline(lines.join("\n"));
  }

  expandInlineOptions(lines, block);
  block = locateApplicationBlock(lines, bundleId);
  if (!block) throw new Error("The selected app configuration could not be located.");
  const optionIndent = block.keyIndent + 2;

  for (const key of OPTION_KEYS) {
    if (!(key in update)) continue;
    block = locateApplicationBlock(lines, bundleId);
    if (!block) break;
    const optionIndex = lines.findIndex(
      (line, index) =>
        index > block!.start && index < block!.end && new RegExp(`^\\s{${optionIndent}}${key}:`).test(line),
    );
    const value = update[key];
    if (typeof value === "boolean") {
      if (optionIndex >= 0) {
        const comment = lines[optionIndex].match(/\s+#.*$/)?.[0] ?? "";
        lines[optionIndex] = `${formatOption(key, value, optionIndent)}${comment}`;
      } else {
        lines.splice(block.end, 0, formatOption(key, value, optionIndent));
      }
    } else if (optionIndex >= 0) {
      lines.splice(optionIndex, 1);
    }
  }

  block = locateApplicationBlock(lines, bundleId);
  if (block) {
    const hasProperties = lines
      .slice(block.start + 1, block.end)
      .some((line) => line.trim() !== "" && !line.trimStart().startsWith("#"));
    if (!hasProperties) lines.splice(block.start, block.end - block.start);
  }

  return ensureTrailingNewline(lines.join("\n").replace(/\n+$/, ""));
}
