// Common utility functions

/**
 * Safely parses JSON with error handling
 */
export function safeJsonParse<T>(jsonString: string, defaultValue: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error("Error parsing JSON:", error);
    return defaultValue;
  }
}

/**
 * Extracts a file path from a string using regex
 */
export function extractFilePath(text: string, defaultPath: string): string {
  // Try to find "saved to" pattern first
  const savedToMatch = text.match(/saved to (.*\.ipa)/i);
  if (savedToMatch && savedToMatch[1]) {
    return savedToMatch[1];
  }

  // Try to find "output:" pattern
  const outputMatch = text.match(/"output":"([^"]*\.ipa)"/);
  if (outputMatch && outputMatch[1]) {
    return outputMatch[1];
  }

  // Try to find any path ending with .ipa
  const ipaPathMatch = text.match(/([/\\][^/\\]*\.ipa)/);
  if (ipaPathMatch && ipaPathMatch[1]) {
    // This might be a partial path, so we need to find the full path
    const pathParts = text.split(ipaPathMatch[1]);
    if (pathParts.length > 0) {
      // Look for the part that contains a valid path
      for (let i = 0; i < pathParts.length; i++) {
        const part = pathParts[i];
        if (part.includes("/")) {
          const lastSlashIndex = part.lastIndexOf("/");
          const possiblePath = part.substring(lastSlashIndex) + ipaPathMatch[1];
          if (possiblePath.startsWith("/")) {
            return possiblePath;
          }
        }
      }
    }
  }

  // If all else fails, return the default path
  return defaultPath;
}

/**
 * Renders star rating as text (e.g., "★★★★☆" for 4.0)
 */
export function renderStarRating(rating: number | undefined): string {
  if (rating === undefined) return "No Rating";

  const boundedRating = Math.min(Math.max(rating, 0), 5);
  const fullStars = Math.floor(boundedRating);
  const halfStar = boundedRating % 1 >= 0.5;
  const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

  return "★".repeat(fullStars) + (halfStar ? "½" : "") + "☆".repeat(emptyStars);
}

/**
 * Truncates text at word boundaries to avoid cutting words in half
 * @param text The text to truncate
 * @param maxLength Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateAtWordBoundary(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) {
    return text;
  }

  // Find the last space before the max length
  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(" ");

  // If we found a space and it's not too close to the beginning, use it
  if (lastSpaceIndex > maxLength * 0.7) {
    return truncated.substring(0, lastSpaceIndex) + "...";
  }

  // Otherwise, just truncate at max length and add ellipsis
  return truncated + "...";
}
