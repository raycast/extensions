export type Search = { from: string; to: string };

/**
 * Parses a query to extract "from" and "to" parameters.
 *
 * @param {string} query - The query string to parse.
 * @return {Search|null} - An object containing "from" and "to" properties, or null if the pattern doesn't match.
 */
export function parseQuery(query: string): Search | null {
  // Define the regex pattern
  const regex = /from:([^\s]+(?: [^\s]+)*)\s+to:([^\s]+(?: [^\s]+)*)/;

  // Execute the regex on the input query
  const match = query.trim().match(regex);

  if (match) {
    return {
      from: match[1],
      to: match[2],
    };
  } else {
    return null; // Return null if the pattern doesn't match
  }
}
