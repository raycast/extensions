import type { OutputMode } from "./preferences";

export function normalizeLatexOutput(
  rawOutput: string,
  outputMode: OutputMode = "latex",
): string {
  const latex = unwrapMathDelimiters(
    stripMarkdownAndLabels(stripThinking(rawOutput)),
  );

  if (!latex) {
    return "";
  }

  switch (outputMode) {
    case "inline":
      return `\\(${latex}\\)`;
    case "display":
      return `\\[${latex}\\]`;
    case "latex":
      return latex;
  }
}

function stripThinking(value: string): string {
  return value.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

function stripMarkdownAndLabels(value: string): string {
  let result = value.trim();
  result = result
    .replace(/^```(?:latex|tex|math)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  result = result
    .replace(/^(?:latex|tex|answer|result|formula)\s*[:：]\s*/i, "")
    .trim();
  return result;
}

function unwrapMathDelimiters(value: string): string {
  let result = value.trim();

  const delimiterPairs: Array<[string, string]> = [
    ["\\[", "\\]"],
    ["\\(", "\\)"],
    ["$$", "$$"],
    ["$", "$"],
  ];

  for (const [opening, closing] of delimiterPairs) {
    if (result.startsWith(opening) && result.endsWith(closing)) {
      result = result
        .slice(opening.length, result.length - closing.length)
        .trim();
    }
  }

  return result;
}
