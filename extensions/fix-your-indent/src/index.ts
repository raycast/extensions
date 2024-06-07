import { showHUD, Clipboard } from "@raycast/api";

const removeLeadingWhitespaces = (code: string) => {
  // Split the code into an array of lines
  const lines = code.split("\n");

  // Get the number of leading whitespaces in the last line
  const leadingSpacesToRemove = lines[lines.length - 1].search(/\S/);

  // Remove the leading spaces
  const trimmedLines = lines.map((line: string) =>
    line.startsWith(" ".repeat(leadingSpacesToRemove)) ? line.slice(leadingSpacesToRemove) : line,
  );

  // Join the trimmed lines back into a single string
  return trimmedLines.join("\n");
};

export default async function main() {
  const { text } = await Clipboard.read();
  await Clipboard.copy(removeLeadingWhitespaces(text));
  await showHUD("Copied to clipboard");
}
