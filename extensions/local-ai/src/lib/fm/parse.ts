import { stripAnsi } from "./ansi";
import { FmError } from "./errors";

export const FALLBACK_MODELS: readonly string[] = ["system"];

const SECTION_HEADER_PATTERN = /^[A-Z][A-Z ]*$/;

export function parseModels(helpText: string): string[] {
  const lines = stripAnsi(helpText).split("\n");
  const start = lines.findIndex((line) => line.trim() === "MODELS");
  if (start === -1) return [...FALLBACK_MODELS];

  const models: string[] = [];
  for (const line of lines.slice(start + 1)) {
    const trimmed = line.trim();
    if (trimmed === "" || SECTION_HEADER_PATTERN.test(trimmed)) break;
    const name = trimmed.split(/\s+/)[0];
    if (!models.includes(name)) models.push(name);
  }
  return models.length > 0 ? models : [...FALLBACK_MODELS];
}

export function parseTokenCount(stdout: string): number {
  const match = stripAnsi(stdout).match(/\d+/);
  if (!match) throw new FmError("unknown", "Could not read the token count from fm", stdout.trim() || undefined);
  return Number.parseInt(match[0], 10);
}
