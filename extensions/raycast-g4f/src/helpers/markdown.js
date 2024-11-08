// Convert markdown so that it is rendered as plain text.
// Useful because Detail only supports markdown, and sometimes we want to show plain text.
export function plainTextMarkdown(text) {
  // Escape special markdown characters
  const escapeChars1 = ["`", "*", "_"];
  for (const char of escapeChars1) {
    // always escape
    text = text.replace(new RegExp(`\\${char}`, "g"), `\\${char}`);
  }

  const escapeChars2 = ["#", "[", "]", "(", ")", "<", ">", "-", "+", "{", "}", ".", "!"];
  for (const char of escapeChars2) {
    // replace only if it's surrounded by whitespace or at the beginning/end of a line
    text = text.replace(new RegExp(`(^|\\s)\\${char}(\\s|$)`, "g"), `$1\\${char}$2`);
  }

  // If a line has no content except spaces, strip it
  // This is useful for creating paragraphs
  text = text.replace(/^\s+$/gm, "");

  // Replace spaces with non-breaking spaces (U+00A0)
  text = text.replace(/ /g, "\u00A0");

  // Add two spaces at the end of each line for line breaks
  text = text.replace(/(\S)(\n)(?!\n)/g, "$1  $2");

  return text;
}
