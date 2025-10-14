/**
 * Utility functions for formatting markdown content in detail views
 */

/**
 * Formats content with a title header
 * @param title - The title to display as an h1 heading
 * @param content - The formatted markdown content to display
 * @returns Formatted markdown string
 */
export function formatContentMarkdown(title: string, content: string): string {
  return `# ${title}
---
${content}`;
}

/**
 * Wraps code in a markdown code block with syntax highlighting
 * @param code - The code to wrap
 * @param language - The language for syntax highlighting (default: "bash")
 * @returns Formatted code block string
 */
export function formatCodeBlock(code: string, language = "markdown"): string {
  return `\`\`\`\`${language}
${code}
\`\`\`\``;
}
