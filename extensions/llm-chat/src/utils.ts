import { getProviderConfig } from "./providers";

const LATEX_RENDER_URL = "https://latex.codecogs.com/svg.latex?";

export function rollThinking(reasoning: string): string {
  if (!reasoning) return "";
  const lines = reasoning.split("\n");
  if (lines.length <= 2) return reasoning;
  return `…\n${lines.slice(-2).join("\n")}`;
}

export function formatThinking(reasoning: string): string {
  return reasoning.split("\n").map((line) => `> ${line}`).join("\n");
}

function createLatexImage(formula: string, displayMode: boolean): string {
  const encoded = encodeURIComponent(formula.trim());
  const image = `![math](${LATEX_RENDER_URL}${encoded})`;
  return displayMode ? `\n\n${image}\n\n` : image;
}

function shouldRenderInlineMath(formula: string): boolean {
  const trimmed = formula.trim();
  if (!trimmed || trimmed.includes("\n")) return false;
  if (/^[\d\s.,]+$/.test(trimmed)) return false;
  return /[A-Za-z\\{}[\]()_^=+\-*/]/.test(trimmed);
}

function renderMathSegments(segment: string): string {
  let output = "";
  let index = 0;

  while (index < segment.length) {
    const char = segment[index];

    if (char === "\\") {
      output += segment.slice(index, index + 2);
      index += 2;
      continue;
    }

    if (char !== "$") {
      output += char;
      index += 1;
      continue;
    }

    const displayMode = segment[index + 1] === "$";
    const delimiterLength = displayMode ? 2 : 1;
    const delimiter = displayMode ? "$$" : "$";
    let cursor = index + delimiterLength;
    let closingIndex = -1;

    while (cursor < segment.length) {
      if (segment[cursor] === "\\") {
        cursor += 2;
        continue;
      }

      if (displayMode ? segment[cursor] === "$" && segment[cursor + 1] === "$" : segment[cursor] === "$") {
        closingIndex = cursor;
        break;
      }

      cursor += 1;
    }

    if (closingIndex === -1) {
      output += delimiter;
      index += delimiterLength;
      continue;
    }

    const formula = segment.slice(index + delimiterLength, closingIndex);

    if (formula.trim() && (displayMode || shouldRenderInlineMath(formula))) {
      output += createLatexImage(formula, displayMode);
    } else {
      output += segment.slice(index, closingIndex + delimiterLength);
    }

    index = closingIndex + delimiterLength;
  }

  return output;
}

export function renderLatex(text: string): string {
  if (!text.includes("$")) return text;

  const parts = text.split(/(```[\s\S]*?```|`[^`\n]+`)/g);
  return parts
    .map((part) => {
      if (part.startsWith("```") || (part.startsWith("`") && part.endsWith("`"))) {
        return part;
      }
      return renderMathSegments(part);
    })
    .join("");
}

export function resolveModelName(provider: string, model?: string): string {
  const providerConfig = getProviderConfig(provider);
  return model || providerConfig.defaultModels[0] || "glm-5";
}

export function parseFloatPref(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = parseFloat(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

export function parseIntPref(value?: string): number | undefined {
  if (!value) return undefined;
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) ? undefined : parsed;
}
