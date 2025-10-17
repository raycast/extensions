/**
 * Extracts a valid domain name from a query string.
 * Returns the domain name (hostname) or null if no valid domain is found.
 *
 * @param query - The input string to extract domain from
 * @returns The domain name (hostname) or null
 */
export const extractDomain = (query: string): string | null => {
  if (!query?.trim()) {
    return null;
  }

  // Clean the input - take the first word if multiple words
  const cleanQuery = query.trim().split(" ")[0];

  try {
    // Try to parse as URL - this handles most cases correctly
    const url = new URL(cleanQuery.startsWith("http") ? cleanQuery : `https://${cleanQuery}`);
    return url.hostname;
  } catch {
    // If URL parsing fails, the input is likely not a valid domain/URL
    return null;
  }
};
