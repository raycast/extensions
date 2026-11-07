import {
  DIGITS_ONLY_REGEX,
  EIGHT_DIGIT_BUSINESS_ID_REGEX,
  FULL_BUSINESS_ID_REGEX,
  MIN_TEXT_QUERY_LENGTH,
} from "../constants";
import type { QueryClassification } from "../types/ui";
import type { Language } from "./language";
import { translate } from "./translations";

function normalizeBusinessId(raw: string): string {
  return `${raw.slice(0, 7)}-${raw.slice(7)}`;
}

export function classifyQuery(rawInput: string, language: Language = "en"): QueryClassification {
  const trimmed = rawInput.trim();

  if (!trimmed) {
    return { kind: "empty" };
  }

  if (FULL_BUSINESS_ID_REGEX.test(trimmed)) {
    return {
      kind: "businessId",
      value: trimmed,
      normalizedBusinessId: trimmed,
    };
  }

  if (EIGHT_DIGIT_BUSINESS_ID_REGEX.test(trimmed)) {
    const normalized = normalizeBusinessId(trimmed);
    return {
      kind: "businessId",
      value: trimmed,
      normalizedBusinessId: normalized,
    };
  }

  if (DIGITS_ONLY_REGEX.test(trimmed)) {
    return {
      kind: "invalid-numeric",
      value: trimmed,
      hint: translate("numericHint", language),
    };
  }

  if (trimmed.length < MIN_TEXT_QUERY_LENGTH) {
    return {
      kind: "too-short-text",
      value: trimmed,
      hint: translate("textHint", language),
    };
  }

  return {
    kind: "name",
    value: trimmed,
  };
}
