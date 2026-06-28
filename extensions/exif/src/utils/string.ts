/**
 * Prettify a JSON string by making sure the number arrays are not too long.
 *
 * @param jsonString - The JSON string to prettify.
 * @param maxLength - The maximum length of a number line.
 * @returns The prettified JSON string.
 */
export const prettifyJson = (jsonString: string, maxLength: number = 50) => {
  let currentNumberLine = "";
  let currentIndent = "";

  const result = jsonString.split("\n").reduce((acc, line) => {
    const trimmedLine = line.trim();

    // Check if this is a number line (with or without comma)
    if (trimmedLine.match(/^\d+,?$/)) {
      if (currentNumberLine.length === 0) {
        // Start a new number line, capture the indentation
        currentIndent = line.replace(/\d+,?/, "");
        currentNumberLine = currentIndent;
      }

      currentNumberLine += `${trimmedLine} `;

      if (currentNumberLine.length > maxLength) {
        // Flush the current line and start fresh
        acc.push(currentNumberLine.trimEnd());
        currentNumberLine = currentIndent;
      }

      return acc;
    } else {
      // Not a number line, flush any accumulated numbers first
      if (currentNumberLine.length > currentIndent.length) {
        acc.push(currentNumberLine.trimEnd());
        currentNumberLine = "";
        currentIndent = "";
      }

      return [...acc, line];
    }
  }, [] as string[]);

  // Handle any remaining accumulated number line
  if (currentNumberLine.length > currentIndent.length) {
    result.push(currentNumberLine.trimEnd());
  }

  return result.join("\n");
};
