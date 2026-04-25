// src/lib/utils/formatLogContent.ts
/**
 * Formats log content for display in Raycast Detail view.
 * - If content is valid JSON, formats it as pretty-printed JSON
 * - If content is a stack trace, formats it in a code block
 * - Otherwise returns content as-is
 */
export function formatLogContent(content: string | null): string | null {
  if (!content) return content;

  // Try parsing as JSON
  try {
    const parsed = JSON.parse(content);
    const formatted = JSON.stringify(parsed, null, 2);
    return `\`\`\`json\n${formatted}\n\`\`\``;
  } catch {
    // Not JSON, continue
  }

  // Check if it's a stack trace
  if (isStackTrace(content)) {
    return `\`\`\`\n${content}\n\`\`\``;
  }

  // Return as-is
  return content;
}

function isStackTrace(content: string): boolean {
  // Check for common stack trace patterns
  const patterns = [
    /^\s*(Error|Exception|Throwable):/m,
    /\s+at\s+\w+\./m,
    /at\s+.*\.\w+\s*\(\s*\w+\.java:\d+\)/m, // Java
    /File\s+".*",\s+line\s+\d+/m, // Python
    /at\s+\w+\s+\(.*:\d+:\d+\)/m, // JavaScript
  ];

  return patterns.some((pattern) => pattern.test(content));
}

/**
 * Extracts the first line of a stack trace (the error message)
 */
export function extractErrorMessage(content: string): string | null {
  const lines = content.split("\n");
  for (const line of lines) {
    if (line.match(/^\s*(Error|Exception|Throwable|Caused by):/)) {
      return line.trim();
    }
  }
  return null;
}
