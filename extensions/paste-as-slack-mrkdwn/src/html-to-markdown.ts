import TurndownService from "turndown";

// Create turndown instance with options optimized for ChatGPT/web content
const turndown = new TurndownService({
  headingStyle: "atx", // Use # style headings
  codeBlockStyle: "fenced", // Use ``` for code blocks
  bulletListMarker: "-", // Use - for unordered lists
  strongDelimiter: "**", // Use ** for bold
  emDelimiter: "*", // Use * for italic
});

// Custom rule for strikethrough (not built-in to turndown)
turndown.addRule("strikethrough", {
  filter: ["del", "s", "strike"],
  replacement: (content) => `~~${content}~~`,
});

// Custom rule for preformatted code blocks
turndown.addRule("pre", {
  filter: "pre",
  replacement: (content, node) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const element = node as any; // Use any to access DOM properties
    const codeElement = element.querySelector?.("code");
    const language = codeElement?.className?.match(/language-(\w+)/)?.[1] || "";
    const code = codeElement?.textContent || element.textContent || "";
    return `\n\`\`\`${language}\n${code.trim()}\n\`\`\`\n`;
  },
});

/**
 * Check if HTML contains meaningful formatting tags
 * Returns true if the HTML has rich formatting that should be converted
 */
export function hasRichFormatting(html: string): boolean {
  if (!html) return false;

  // Tags that indicate rich formatting
  const formattingTags = [
    /<strong\b/i,
    /<b\b/i,
    /<em\b/i,
    /<i\b/i,
    /<code\b/i,
    /<pre\b/i,
    /<ul\b/i,
    /<ol\b/i,
    /<li\b/i,
    /<h[1-6]\b/i,
    /<a\s+href/i,
    /<del\b/i,
    /<s\b/i,
    /<strike\b/i,
    /<blockquote\b/i,
  ];

  return formattingTags.some((pattern) => pattern.test(html));
}

/**
 * Convert HTML to Markdown
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return "";

  // Clean up common HTML issues
  const cleaned = html
    // Remove zero-width spaces and other invisible characters
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    // Normalize line breaks
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n");

  // Convert to markdown
  let markdown = turndown.turndown(cleaned);

  // Clean up turndown output
  markdown = markdown
    // Remove backslash escaping on numbers followed by periods (1\. -> 1.)
    // This can appear in numbered lists or headings like "### 1. Title"
    .replace(/(\d+)\\\./g, "$1.");

  // Remove blank lines before and between list items
  // Keep blank lines after lists (before next non-list content)
  const lines = markdown.split("\n");
  const cleanedLines: string[] = [];
  const listItemPattern = /^[\t ]*(?:[-*•]|\d+\.)\s/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // If this is a blank line, check what comes next
    if (line.trim() === "") {
      // Look ahead to find next non-empty line
      let nextNonEmpty = "";
      for (let j = i + 1; j < lines.length; j++) {
        if (lines[j].trim() !== "") {
          nextNonEmpty = lines[j];
          break;
        }
      }

      // Skip blank line if next content is a list item
      if (listItemPattern.test(nextNonEmpty)) {
        continue;
      }
    }

    cleanedLines.push(line);
  }

  markdown = cleanedLines
    .join("\n")
    // Remove trailing whitespace from each line (but not newlines)
    .replace(/[ \t]+$/gm, "")
    // Collapse 3+ newlines to double newline (preserve paragraph breaks)
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return markdown;
}
