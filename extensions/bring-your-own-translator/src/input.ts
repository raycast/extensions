// Preserve punctuation and internal whitespace; strip accidental edge whitespace/control characters.
export function cleanInput(value: string): string {
  // eslint-disable-next-line no-control-regex -- Strip accidental edge control characters from pasted input.
  return value.replace(
    /^[\s\u0000-\u001f\u007f\u200b\u2060]+|[\s\u0000-\u001f\u007f\u200b\u2060]+$/gu,
    "",
  );
}
