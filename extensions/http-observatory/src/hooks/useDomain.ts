/**
 * Extracts a valid domain name from a query string.
 * Returns the domain name (hostname) or null if no valid domain is found.
 *
 * @param query - The input string to extract domain from
 * @returns The domain name (hostname) or null
 */
export const useDomain = (query: string): string | null => {
  if (!query || typeof query !== "string") {
    return null;
  }

  // Clean the input - take the first word if multiple words
  const cleanQuery = query.trim().split(" ")[0];

  if (!cleanQuery) {
    return null;
  }

  // Try to parse as URL first (handles full URLs)
  try {
    const url = new URL(cleanQuery.startsWith("http") ? cleanQuery : `https://${cleanQuery}`);
    return url.hostname;
  } catch {
    // If URL parsing fails, try to extract domain using regex
    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    const match = cleanQuery.match(domainRegex);

    if (match) {
      return match[0];
    }
  }

  return null;
};
