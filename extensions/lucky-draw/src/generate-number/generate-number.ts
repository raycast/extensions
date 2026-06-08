import type { GenerateNumberOptions } from "./types";

/**
 * Generate a random number within an inclusive range.
 * @param {GenerateNumberOptions} options - The minimum and maximum values.
 * @returns {number} The generated number.
 */
export default function generateNumber({ min, max }: GenerateNumberOptions): number {
  if (max < min) {
    throw new Error("Max must be greater than min");
  }

  if (min === max) {
    return min;
  }

  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Format the generated number as markdown.
 * @param {number} value - The generated number.
 * @returns {string} The formatted markdown string.
 */
export function formatGenerateNumberMarkdown(value: number): string {
  return `# ${value}`;
}
