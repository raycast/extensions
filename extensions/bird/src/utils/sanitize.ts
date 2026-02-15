/**
 * Removes invalid Unicode surrogate pairs and other problematic characters
 * that can break JSON parsing and rendering.
 */
export function sanitizeString(str: string): string {
  if (typeof str !== "string") return ""
  return (
    str
      // Remove unpaired surrogates
      .replace(
        /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
        "",
      )
      // Remove other potentially problematic control characters (but not newlines/tabs)
      // eslint-disable-next-line no-control-regex
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
  )
}

/**
 * Recursively sanitizes all string properties in an object.
 */
export function sanitizeObject<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj
  }

  if (typeof obj === "string") {
    return sanitizeString(obj) as T
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item)) as T
  }

  if (typeof obj === "object") {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = sanitizeObject(value)
    }
    return result as T
  }

  return obj
}

/**
 * Safely parses a tweet, returning null if it's invalid.
 */
export function safeParseTweet<T extends { id: string; text: string }>(
  tweet: T,
): T | null {
  try {
    // Validate required fields exist
    if (!tweet.id || typeof tweet.text !== "string") {
      return null
    }

    const sanitized = sanitizeObject(tweet)

    // Verify the sanitized tweet is still valid
    if (!sanitized.id || typeof sanitized.text !== "string") {
      return null
    }

    return sanitized
  } catch {
    return null
  }
}
