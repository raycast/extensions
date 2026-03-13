export function rewrapParagraphs(text: string, width: number = 80) {
  // Split the text into paragraphs (two or more line breaks)
  const paragraphs = text.split(/\n\s*\n/);

  const wrappedParagraphs = paragraphs
    .map((paragraph) => {
      // Remove all single line breaks in a paragraph
      const singleLineMerged = paragraph.replace(/\n/g, " ").replace(/\s+/g, " ").trim();

      const words = singleLineMerged.split(" ");
      const lines = [];
      let currentLine = "";

      for (const word of words) {
        if ((currentLine + " " + word).trim().length > width) {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = (currentLine + " " + word).trim();
        }
      }

      if (currentLine) lines.push(currentLine);

      return lines.join("\n");
    })
    .filter((paragraph) => paragraph.length > 0);

  return wrappedParagraphs.join("\n\n");
}

export function rewrapText(text: string, width?: number): string {
  // If no text provided, do nothing
  if (!text) return text;

  // If no width provided, use "infinity" to "unwrap" text
  if (width === undefined) {
    width = Number.MAX_SAFE_INTEGER;
  }

  // If width is negative, use "infinity" to "unwrap" text
  if (width <= 0) return text;

  // const wrapper = wrap(width);
  return rewrapParagraphs(text, width);
}
