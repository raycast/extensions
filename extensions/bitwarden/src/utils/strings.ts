export const capitalize = (value: string, lowercaseRest = false) => {
  const firstLetter = value.charAt(0).toUpperCase();
  const rest = lowercaseRest ? value.slice(1).toLowerCase() : value.slice(1);

  return firstLetter + rest;
};

/**
 * Seven-backtick code fence delimiter.
 *
 * Standard triple-backtick fences would break if the wrapped value itself
 * contains triple backticks. Using seven backticks makes collisions with
 * real content virtually impossible while still being valid markdown.
 */
const DETAIL_CODE_FENCE = "```````";

/**
 * Wraps a raw string value in a markdown fenced code block so that it renders
 * as monospaced, unformatted plain text inside a Raycast `List.Item.Detail`
 * panel. Uses {@link DETAIL_CODE_FENCE} to avoid conflicts with backticks
 * that may appear in the value itself.
 *
 * @param value - The raw text to display.
 * @returns A markdown string suitable for the `markdown` prop of `List.Item.Detail`.
 *
 * @example
 * ```ts
 * asPlainTextDetail("my secret")
 * // => "```````\nmy secret\n```````"
 * ```
 */
export function asPlainTextDetail(value: string): string {
  return `${DETAIL_CODE_FENCE}\n${value}\n${DETAIL_CODE_FENCE}`;
}
