/**
 * Estimates the number of tokens in a text string using a simple heuristic.
 * Uses the approximation: 1 token ≈ 4 characters for English code.
 *
 * @param content - The text content to estimate tokens for.
 * @returns The estimated number of tokens.
 */
export function estimateTokens(content: string): number {
  return Math.ceil(content.length / 4);
}
