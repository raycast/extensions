import { getPreferenceValues } from "@raycast/api";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { DEFAULT_EXTENSIONS, MAX_CLIPBOARD_OFFSET } from "./constants";
import { type InsertPosition } from "./formatting";

export type SeparatorRule = "single-newline" | "blank-line" | "custom";

interface RawPreferences {
  roots?: string;
  allowedExtensions?: string;
  searchExcludes?: string;
  searchMaxDepth?: string;
  separatorRule?: SeparatorRule;
  customSeparator?: string;
  ensureTrailingNewline?: boolean;
  timestampFormat?: string;
  defaultClipboardOffset?: string;
  defaultInsertPosition?: InsertPosition;
}

export interface ResolvedPreferences {
  roots: string[];
  allowedExtensions: string[];
  searchExcludes: string[];
  searchMaxDepth: number;
  separator: string;
  ensureTrailingNewline: boolean;
  timestampFormat: string;
  defaultClipboardOffset: number;
  defaultInsertPosition: InsertPosition;
}

function parseList(input: string | undefined): string[] {
  if (!input) return [];

  return input
    .split(/[\n,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function expandHome(inputPath: string): string {
  if (inputPath === "~") return homedir();
  if (inputPath.startsWith("~/"))
    return path.join(homedir(), inputPath.slice(2));
  return inputPath;
}

function normalizeRoots(rootsInput: string | undefined): string[] {
  const parsed = parseList(rootsInput);
  if (parsed.length === 0) {
    const documents = path.join(homedir(), "Documents");
    return [existsSync(documents) ? documents : homedir()];
  }

  return parsed.map((root) => path.resolve(expandHome(root)));
}

function normalizeExtensions(extensionsInput: string | undefined): string[] {
  const parsed = parseList(extensionsInput);
  const source = parsed.length > 0 ? parsed : DEFAULT_EXTENSIONS;

  return Array.from(
    new Set(
      source
        .map((ext) => ext.trim().toLowerCase())
        .filter(Boolean)
        .map((ext) => (ext.startsWith(".") ? ext : `.${ext}`)),
    ),
  );
}

function normalizeSearchExcludes(input: string | undefined): string[] {
  const parsed = parseList(input);
  return Array.from(
    new Set(parsed.map((entry) => entry.trim()).filter(Boolean)),
  );
}

function decodeEscapes(value: string): string {
  return value.replace(/\\n/g, "\n").replace(/\\t/g, "\t");
}

function resolveSeparator(
  rule: SeparatorRule | undefined,
  customSeparator: string | undefined,
): string {
  if (rule === "blank-line") return "\n\n";
  if (rule === "custom") {
    const normalized = decodeEscapes(customSeparator?.trim() ?? "");
    return normalized.length > 0 ? normalized : "\n";
  }

  return "\n";
}

function parseClipboardOffset(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "0", 10);

  if (!Number.isFinite(parsed)) return 0;
  if (parsed < 0) return 0;
  if (parsed > MAX_CLIPBOARD_OFFSET) return MAX_CLIPBOARD_OFFSET;

  return parsed;
}

function parseInsertPosition(
  value: InsertPosition | undefined,
): InsertPosition {
  if (value === "beginning") return "beginning";
  return "end";
}

function parseSearchMaxDepth(value: string | undefined): number {
  const parsed = Number.parseInt(value ?? "8", 10);
  if (!Number.isFinite(parsed)) return 8;
  if (parsed < 0) return 0;
  if (parsed > 64) return 64;
  return parsed;
}

export function getResolvedPreferences(): ResolvedPreferences {
  const prefs = getPreferenceValues<RawPreferences>();

  return {
    roots: normalizeRoots(prefs.roots),
    allowedExtensions: normalizeExtensions(prefs.allowedExtensions),
    searchExcludes: normalizeSearchExcludes(prefs.searchExcludes),
    searchMaxDepth: parseSearchMaxDepth(prefs.searchMaxDepth),
    separator: resolveSeparator(prefs.separatorRule, prefs.customSeparator),
    ensureTrailingNewline: prefs.ensureTrailingNewline ?? true,
    timestampFormat: prefs.timestampFormat?.trim() || "YYYY-MM-DD HH:mm",
    defaultClipboardOffset: parseClipboardOffset(prefs.defaultClipboardOffset),
    defaultInsertPosition: parseInsertPosition(prefs.defaultInsertPosition),
  };
}
