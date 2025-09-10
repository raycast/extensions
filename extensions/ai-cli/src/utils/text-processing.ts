import { FormattingVariant } from "../types";
import { createVariantId } from "./entity-operations";
import { messages } from "@/locale/en/messages";

// Constants

const TEXT_PROCESSING_CONSTANTS = {
  QUOTE_PATTERNS: {
    DOUBLE: '"',
    SINGLE: "'",
  },
} as const;

const EXPLANATION_PATTERNS = [
  /^Here(?:'s| is) (?:the |your )?(?:reformatted|formatted) (?:text|version|message|comment).*?:\s*\n+/i,
  /^I've reformatted.*?:\s*\n+/i,
  /^The text has been.*?:\s*\n+/i,
  /^(?:Reformatted|Formatted) (?:for|as a) (?:Slack|GitHub|PR).*?:\s*\n+/i,
  /^This is formatted for.*?:\s*\n+/i,
  /^Data collection is disabled\./i, // Gemini CLI sometimes adds this line at the start
] as const;

// Text Processing Functions

export function escapeBackticks(text: string): string {
  return text.replace(/`/g, "\\`");
}

/**
 * Cleans Claude AI responses by removing explanation patterns and surrounding quotes.
 * Processes raw responses to extract formatted content only.
 */
export function cleanAgentResponse(text: string): string {
  let cleaned = text.trim();

  // Handle special pattern with capture group for codex output
  const codexPattern = /\[.*?] codex\s*\n\s*(.*?)\s*\n\[.*?] tokens used:/s;
  const codexMatch = cleaned.match(codexPattern);
  if (codexMatch) {
    return codexMatch[1].trim();
  }

  // Remove common explanation patterns
  for (const pattern of EXPLANATION_PATTERNS) {
    if (pattern !== codexPattern) {
      cleaned = cleaned.replace(pattern, "");
    }
  }

  // Remove surrounding quotes if present
  const { DOUBLE, SINGLE } = TEXT_PROCESSING_CONSTANTS.QUOTE_PATTERNS;
  if (
    (cleaned.startsWith(DOUBLE) && cleaned.endsWith(DOUBLE)) ||
    (cleaned.startsWith(SINGLE) && cleaned.endsWith(SINGLE))
  ) {
    cleaned = cleaned.slice(1, -1);
  }

  return cleaned.trim();
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + messages.textProcessing.truncatedSuffix;
}

export function createVariantObject(
  content: string,
  index: number,
  originalInput?: string,
  originalPrompt?: string
): FormattingVariant {
  const idSuffix = (index + 1).toString();
  return {
    id: createVariantId(idSuffix),
    content: content.trim(),
    index,
    originalInput,
    originalPrompt,
  };
}

/**
 * Splits Claude response into individual variants separated by "===VARIANT===" delimiter.
 * Converts text into structured variant objects with unique IDs and duplicate handling.
 */
export function splitVariants(text: string, originalInput?: string, originalPrompt?: string): FormattingVariant[] {
  // Single-variant system: always return one variant with the full content
  return [createVariantObject(text, 0, originalInput, originalPrompt)];
}
