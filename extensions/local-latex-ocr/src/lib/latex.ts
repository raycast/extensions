import katex from "katex";

export const DEFAULT_MEAN_CONFIDENCE = 0.72;
export const DEFAULT_MIN_CONFIDENCE = 0.08;

export function postProcessLatex(input: string): string {
  const unwrapped = input
    .trim()
    .replace(/^\\\[\s*/, "")
    .replace(/\s*\\\]$/, "")
    .replace(/^\$\$\s*/, "")
    .replace(/\s*\$\$$/, "")
    .replace(/^\\\(\s*/, "")
    .replace(/\s*\\\)$/, "");
  const textPattern = /(\\(?:operatorname|mathrm|text|mathbf)\s?\*?\s*\{.*?\})/g;
  const protectedParts: string[] = [];
  let output = unwrapped.replace(textPattern, (match) => {
    const index = protectedParts.push(match.replaceAll(" ", "")) - 1;
    return `\uE000${index}\uE000`;
  });

  let previous = "";
  const letter = "[a-zA-Z]";
  const nonLetter = "[\\W_^\\d]";
  while (previous !== output) {
    previous = output;
    output = output
      .replace(new RegExp(`(?!\\\\ )(${nonLetter})\\s+?(${nonLetter})`, "g"), "$1$2")
      .replace(new RegExp(`(?!\\\\ )(${nonLetter})\\s+?(${letter})`, "g"), "$1$2")
      .replace(new RegExp(`(${letter})\\s+?(${nonLetter})`, "g"), "$1$2");
  }

  return output
    .replace(/\uE000(\d+)\uE000/g, (_, index: string) => protectedParts[Number(index)])
    .trim();
}

export function hasBalancedLatex(input: string): boolean {
  let braces = 0;
  let escaped = false;
  for (const character of input) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
    } else if (character === "{") {
      braces += 1;
    } else if (character === "}") {
      braces -= 1;
      if (braces < 0) return false;
    }
  }
  if (braces !== 0) return false;

  const environmentStack: string[] = [];
  for (const match of input.matchAll(/\\(begin|end)\{([^}]+)\}/g)) {
    if (match[1] === "begin") environmentStack.push(match[2]);
    else if (environmentStack.pop() !== match[2]) return false;
  }
  return environmentStack.length === 0;
}

export function isKatexValid(input: string): boolean {
  try {
    katex.renderToString(input, { throwOnError: true, strict: "error", output: "html" });
    return true;
  } catch {
    return false;
  }
}

export function getReviewReasons(input: {
  latex: string;
  meanTokenProbability: number;
  minimumTokenProbability: number;
  eosReached: boolean;
  tokenCount: number;
  maxTokenCount: number;
}): string[] {
  const reasons: string[] = [];
  if (!input.eosReached) reasons.push("The model did not emit an end token");
  if (input.tokenCount >= input.maxTokenCount) reasons.push("The result reached the token limit");
  if (!hasBalancedLatex(input.latex)) reasons.push("LaTeX braces or environments are unbalanced");
  if (!isKatexValid(input.latex)) reasons.push("KaTeX could not render the result");
  if (input.meanTokenProbability < DEFAULT_MEAN_CONFIDENCE)
    reasons.push("Average token confidence is low");
  if (input.minimumTokenProbability < DEFAULT_MIN_CONFIDENCE)
    reasons.push("At least one token has very low confidence");
  return [...new Set(reasons)];
}
