export const capitalize = (value: string, lowercaseRest = false) => {
  const firstLetter = value.charAt(0).toUpperCase();
  const rest = lowercaseRest ? value.slice(1).toLowerCase() : value.slice(1);

  return firstLetter + rest;
};

const DETAIL_CODE_FENCE = "```````";

/**
 * Wraps a raw string value in a markdown fenced code block so that it renders
 * as monospaced, unformatted plain text inside a Raycast `List.Item.Detail`
 * panel.
 */
export function asPlainTextDetail(value: string): string {
  return `${DETAIL_CODE_FENCE}\n${value}\n${DETAIL_CODE_FENCE}`;
}
