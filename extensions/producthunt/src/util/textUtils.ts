/**
 * Utility functions for text processing and sanitization
 */

/**
 * Cleans text by replacing Unicode escapes and HTML entities with actual characters
 * @param text The text to clean
 * @returns The cleaned text
 */
export function cleanText(text: string | undefined | null): string {
  if (!text) return "";

  return (
    text
      // Convert all Unicode escapes (like \u0026)
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
      // Replace common HTML entities
      .replace(
        /&(amp|lt|gt|quot|#39);/g,
        (_, entity: "amp" | "lt" | "gt" | "quot" | "#39") =>
          ({ amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'" })[entity] || _,
      )
  );
}

/**
 * Helper function to replace all occurrences of 'undefined' with 'null' in JSON strings
 * and handle other potential JSON parsing issues
 * @param jsonString The JSON string to sanitize
 * @returns The sanitized JSON string
 */
export function sanitizeJsonString(jsonString: string | undefined): string | undefined {
  if (!jsonString) return jsonString;

  // Replace undefined with null
  let sanitized = jsonString.replace(/undefined/g, "null");

  // Replace control characters that might break JSON parsing
  // eslint-disable-next-line no-control-regex
  sanitized = sanitized.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

  // Fix unescaped quotes and backslashes that might break JSON
  sanitized = sanitized.replace(/\\(?!["\\/bfnrt])/g, "\\\\");

  // Handle potential trailing commas in arrays and objects
  sanitized = sanitized.replace(/,\s*([}\]])/g, "$1");

  // Handle unescaped line breaks in strings
  sanitized = sanitized.replace(/([^\\])(["'])\s*[\n\r]+\s*(["'])/g, "$1$2 $3");

  // Handle potential non-whitespace characters after JSON
  try {
    // Try to parse the JSON to find where it ends
    JSON.parse(sanitized);
    return sanitized;
  } catch (error) {
    if (error instanceof SyntaxError && error.message.includes("position")) {
      // Extract position from error message
      const positionMatch = error.message.match(/position (\d+)/);
      if (positionMatch && positionMatch[1]) {
        const position = parseInt(positionMatch[1], 10);

        // Try to find a valid JSON substring
        try {
          // First try: take everything up to the error position
          const truncated = sanitized.substring(0, position);
          // Check if this is valid JSON by itself
          JSON.parse(truncated);
          return truncated;
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (_e1) {
          // Second try: look for the last valid closing bracket
          const lastValidJson = findLastValidJson(sanitized);
          if (lastValidJson) {
            return lastValidJson;
          }
        }
      }
    }

    // If all else fails, try a more aggressive approach
    return aggressiveSanitization(sanitized);
  }
}

/**
 * Helper function to find the last valid JSON in a string
 * @param str The string to search
 * @returns The last valid JSON string or null
 */
function findLastValidJson(str: string): string | null {
  // Try to find the last valid JSON by looking for balanced brackets
  let bracketCount = 0;
  let lastClosingBracketPos = -1;

  for (let i = 0; i < str.length; i++) {
    if (str[i] === "[") bracketCount++;
    else if (str[i] === "]") {
      bracketCount--;
      if (bracketCount === 0) lastClosingBracketPos = i;
    }
  }

  if (lastClosingBracketPos > 0) {
    try {
      const candidate = str.substring(0, lastClosingBracketPos + 1);
      JSON.parse(candidate);
      return candidate;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      // Not valid JSON, continue with other approaches
    }
  }

  return null;
}

/**
 * More aggressive sanitization for problematic JSON
 * @param str The string to sanitize
 * @returns The sanitized string
 */
function aggressiveSanitization(str: string): string {
  // Replace any potentially problematic sequences
  let result = str;

  // Replace any non-ASCII characters
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[^\x00-\x7F]/g, "");

  // Replace any unescaped control characters
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[\x00-\x1F\x7F-\x9F]/g, "");

  // Fix unbalanced quotes
  const quoteCount = (result.match(/"/g) || []).length;
  if (quoteCount % 2 !== 0) {
    // Find the last quote and remove everything after it
    const lastQuotePos = result.lastIndexOf('"');
    if (lastQuotePos > 0) {
      result = result.substring(0, lastQuotePos + 1);
    }
  }

  // Ensure the string ends with proper JSON structure
  if (!result.endsWith("]")) {
    // Find the last closing bracket
    const lastBracketPos = result.lastIndexOf("]");
    if (lastBracketPos > 0) {
      result = result.substring(0, lastBracketPos + 1);
    }
  }

  return result;
}
