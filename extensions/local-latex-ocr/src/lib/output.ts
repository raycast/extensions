import type { OutputMode } from "../types";

export function formatLatex(latex: string, mode: OutputMode): string {
  const normalized = latex.trim();
  if (mode === "inline") return `$${normalized}$`;
  if (mode === "display") return `$$\n${normalized}\n$$`;
  return normalized;
}
