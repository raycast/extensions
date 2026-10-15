import type { ReviewWarning } from "../types";
import { checkPlaceholders } from "./text-protection";

export interface ValidationInput {
  /** Original text with protected strings replaced by placeholders. */
  protectedOriginal: string;
  /** Raw model output (still containing placeholders). */
  protectedOutput: string;
  /** Original protected tokens, in placeholder order. */
  tokens: string[];
  /** Final text after restoring placeholders. */
  restored: string;
}

const NEGATION_RE = /\b(?:not|no|never|cannot|without|neither|nor|none)\b|n't\b/gi;
const CONDITION_RE = /\b(?:if|unless)\b/gi;
const NUMBER_RE = /\d+(?:[.,]\d+)*/g;

function count(text: string, pattern: RegExp): number {
  return (text.match(pattern) ?? []).length;
}

function numbersIn(text: string): string[] {
  // Placeholders contain digits; strip them so only free-standing numbers are compared.
  return (text.replace(/\[\[\s*P\d+\s*\]\]/g, " ").match(NUMBER_RE) ?? []).map((n) => n.replace(/,/g, ""));
}

function preview(token: string): string {
  const flat = token.replace(/\s+/g, " ");
  return flat.length > 40 ? `${flat.slice(0, 37)}...` : flat;
}

export function validateConversion(input: ValidationInput): ReviewWarning[] {
  const warnings: ReviewWarning[] = [];
  const { protectedOriginal, protectedOutput, tokens, restored } = input;

  if (restored.trim().length === 0) {
    return [{ severity: "error", message: "The AI provider returned no rewritten text." }];
  }

  const check = checkPlaceholders(protectedOutput, tokens.length);
  for (const id of check.missing) {
    warnings.push({
      severity: "error",
      message: `Protected content is missing from the result: ${preview(tokens[id])}`,
    });
  }
  for (const id of check.duplicated) {
    warnings.push({
      severity: "warning",
      message: `Protected content appears more than once in the result: ${preview(tokens[id])}`,
    });
  }
  if (check.unknown.length > 0) {
    warnings.push({
      severity: "error",
      message: "The result contains unresolved placeholders. Do not use it without editing.",
    });
  }

  // Verbatim check on the final text: every token must still be present.
  for (const [id, token] of tokens.entries()) {
    if (!check.missing.includes(id) && !restored.includes(token)) {
      warnings.push({ severity: "error", message: `Protected content was altered: ${preview(token)}` });
    }
  }

  const negBefore = count(protectedOriginal, NEGATION_RE);
  const negAfter = count(protectedOutput, NEGATION_RE);
  if (negBefore !== negAfter) {
    warnings.push({
      severity: "warning",
      message: `Negation count changed (${negBefore} before, ${negAfter} after). Check that no warning or prohibition changed.`,
    });
  }

  const condBefore = count(protectedOriginal, CONDITION_RE);
  const condAfter = count(protectedOutput, CONDITION_RE);
  if (condBefore > 0 && condAfter === 0) {
    warnings.push({
      severity: "warning",
      message: "Conditional wording (if/unless) was removed. Check the conditions.",
    });
  }

  const remaining = numbersIn(protectedOutput);
  for (const n of numbersIn(protectedOriginal)) {
    const at = remaining.indexOf(n);
    if (at === -1) {
      warnings.push({ severity: "warning", message: `The number ${n} from the original is not in the result.` });
    } else {
      remaining.splice(at, 1);
    }
  }

  return warnings;
}

export function hasBlockingWarnings(warnings: ReviewWarning[]): boolean {
  return warnings.some((w) => w.severity === "error");
}
