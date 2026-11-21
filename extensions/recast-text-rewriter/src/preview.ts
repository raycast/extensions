// Keep prose readable without interpreting source Markdown, HTML, or remote
// images. Leading indentation is nonbreaking so it cannot open a code block.
export function literalMarkdown(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      line
        .replace(/[\\`*_{}[\]()<>#+\-.!|~&$]/g, "\\$&")
        .replace(/^[ \t]+/, (indent) =>
          indent
            .replace(/ /g, "\u00a0")
            .replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0"),
        ),
    )
    .join("  \n");
}
