import * as chrono from "chrono-node";
import { PATTERNS } from "./patterns";
import { ContentResult } from "./types";

export async function detectContent(text: string): Promise<ContentResult> {
  const trimmed = text.trim();
  const wordCount = trimmed.split(/\s+/).length;
  const charCount = trimmed.length;

  // Check URL first (high confidence)
  if (PATTERNS.url.test(trimmed)) {
    return {
      type: "url",
      confidence: 1.0,
      entities: { url: trimmed.match(PATTERNS.url)?.[0] },
    };
  }

  // Check JSON
  if (isValidJSON(trimmed)) {
    return {
      type: "json",
      confidence: 1.0,
      entities: {},
    };
  }

  // Normalize European time format (14h → 14:00) before parsing
  const normalizedText = trimmed.replace(/\b(\d{1,2})h\b/gi, "$1:00");

  // Check for dates/meetings
  const dateResults = chrono.parse(normalizedText);
  if (dateResults.length > 0) {
    // Filter out false positives (e.g., currency amounts like "$1", version numbers, durations)
    const firstResult = dateResults[0];
    const dateTextIndex = trimmed.indexOf(firstResult.text);

    // Check if the detected "time" is actually a currency or other false positive
    let isValidDateTime = true;

    if (dateTextIndex > 0) {
      const charBefore = trimmed[dateTextIndex - 1];
      // Skip if preceded by currency symbols or version indicators
      if (/[$€£¥#v]/.test(charBefore)) {
        isValidDateTime = false;
      }
    }

    // Filter out durations (e.g., "for 20 seconds", "2-3 minutes")
    if (/\b(for|about|around)\s+\d+(-\d+)?\s+(seconds?|minutes?|hours?)\b/i.test(firstResult.text)) {
      isValidDateTime = false;
    }

    // Additional check: if only time was detected (no date), require meeting context
    const onlyTimeDetected =
      !firstResult.start.isCertain("day") &&
      !firstResult.start.isCertain("month") &&
      firstResult.start.isCertain("hour");

    if (onlyTimeDetected && charCount > 50) {
      // For longer text with only a time (no date), require meeting keywords
      if (!hasMeetingKeywords(trimmed)) {
        isValidDateTime = false;
      }
    }

    if (isValidDateTime) {
      // If we have multiple results, try to merge date and time components
      let finalDate: Date;
      let dateText: string;

      if (dateResults.length > 1) {
        // Check if first has day but no time, and second has time
        const first = dateResults[0];
        const second = dateResults[1];

        const firstHasDay = first.start.isCertain("day");
        const firstHasTime = first.start.isCertain("hour");
        const secondHasTime = second.start.isCertain("hour");

        if (firstHasDay && !firstHasTime && secondHasTime) {
          // Merge: use date from first, time from second
          const baseDate = first.start.date();
          const timeDate = second.start.date();
          baseDate.setHours(timeDate.getHours(), timeDate.getMinutes(), 0, 0);
          finalDate = baseDate;
          dateText = `${first.text} ${second.text}`;
        } else {
          // Use the first result
          finalDate = first.start.date();
          dateText = first.text;
        }
      } else {
        finalDate = dateResults[0].start.date();
        dateText = dateResults[0].text;
      }

      return {
        type: "meeting",
        confidence: 0.9,
        entities: {
          date: finalDate,
          dateText: dateText,
          location: extractLocation(trimmed),
        },
      };
    }
  }

  // Check for meeting-like text even without parseable date
  // (e.g., "meet at Cafe Amalia", "lunch at Restaurant X")
  if (hasMeetingKeywords(trimmed)) {
    const location = extractLocation(trimmed);
    if (location) {
      return {
        type: "meeting",
        confidence: 0.7,
        entities: {
          location,
        },
      };
    }
  }

  // Check address
  if (PATTERNS.address.test(trimmed)) {
    return {
      type: "address",
      confidence: 0.8,
      entities: { address: trimmed },
    };
  }

  // Categorize by length
  if (wordCount <= 2 && charCount < 30) {
    return {
      type: "word",
      confidence: 0.9,
      entities: {},
    };
  }

  if (charCount < 100) {
    return {
      type: "short",
      confidence: 0.9,
      entities: {},
    };
  }

  return {
    type: "long",
    confidence: 0.9,
    entities: {},
  };
}

function isValidJSON(text: string): boolean {
  if (!text.startsWith("{") && !text.startsWith("[")) return false;

  // Try parsing as-is first
  try {
    JSON.parse(text);
    return true;
  } catch {
    // If it fails, try removing trailing comma (common when copying from code)
    const withoutTrailingComma = text.replace(/([}\]])\s*,\s*$/, "$1");
    try {
      JSON.parse(withoutTrailingComma);
      return true;
    } catch {
      return false;
    }
  }
}

function hasMeetingKeywords(text: string): boolean {
  const meetingKeywords = /\b(meet|meeting|lunch|dinner|breakfast|coffee|call|sync|chat|working at|gonna be at)\b/i;
  return meetingKeywords.test(text);
}

function extractLocation(text: string): string | undefined {
  // Prioritize "in [Location]" or "at [Place Name]" (not times)
  // Look for location keywords followed by a place name (capitalized or common place words)
  const placeMatch = text.match(
    /(?:at|in)\s+(?:the\s+)?([A-Z][a-zA-Z\s]+?|(?:cafe|restaurant|bar|office|park|library|gym|mall|center|store|shop|hotel)\s+[a-zA-Z\s]+?)(?:\s+(?:for|from|at\s+\d|on|tomorrow|today|next|this)|$)/i,
  );
  if (placeMatch) {
    return placeMatch[1].trim();
  }

  // Fallback: general "at/in [Location]" pattern
  const match = text.match(
    /(?:at|in)\s+(?:the\s+)?([^,.\n]+?)(?:\s+(?:at|on|for|from|tomorrow|today|next|this|\d{1,2}(?::\d{2})?\s*(?:am|pm|h)?)|$)/i,
  );
  return match?.[1]?.trim();
}
