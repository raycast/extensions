/**
 * Task 8.4: Markdown Error Formatter
 * Converts StructuredPythonError to readable markdown for Raycast UI
 */

import { StructuredPythonError, categorizeError, ErrorCategory } from "./enhanced-error-types";

/**
 * Format structured error as readable markdown
 */
export function formatErrorAsMarkdown(error: StructuredPythonError): string {
  const category = categorizeError(error.errorType);
  const icon = getErrorIcon(category);

  let markdown = `${icon} **${error.errorType}**\n\n`;
  markdown += `${error.message}\n\n`;

  // Add stack trace for runtime errors
  if (error.hasTraceback && error.stackFrames.length > 0) {
    markdown += `**Stack Trace:**\n\`\`\`\n`;

    error.stackFrames.forEach((frame, index) => {
      const isLast = index === error.stackFrames.length - 1;
      const prefix = isLast ? "└──" : "├──";

      markdown += `${prefix} File "${frame.file}", line ${frame.line}`;
      if (frame.functionName) {
        markdown += `, in ${frame.functionName}`;
      }
      markdown += "\n";

      if (frame.codeContext && isLast) {
        markdown += `    ${frame.codeContext}\n`;
      }
    });

    markdown += `\`\`\`\n\n`;
  }

  // Add syntax context for syntax errors
  if (error.syntaxContext) {
    markdown += `**Code:**\n\`\`\`python\n`;
    markdown += `${error.syntaxContext.line}\n`;

    if (error.syntaxContext.position !== undefined) {
      markdown += `${" ".repeat(error.syntaxContext.position)}^\n`;
    }

    markdown += `\`\`\`\n\n`;
  }

  // Add suggestions
  if (error.suggestions && error.suggestions.length > 0) {
    markdown += `**💡 Suggestions:**\n`;
    error.suggestions.forEach((suggestion) => {
      markdown += `- ${suggestion}\n`;
    });
  }

  return markdown.trim();
}

/**
 * Get appropriate icon for error category
 */
function getErrorIcon(category: ErrorCategory): string {
  switch (category) {
    case ErrorCategory.SYNTAX:
      return "📝";
    case ErrorCategory.RUNTIME:
      return "⚡";
    case ErrorCategory.IMPORT:
      return "📦";
    case ErrorCategory.SYSTEM:
      return "🔧";
    default:
      return "❌";
  }
}

/**
 * Format error for compact display (single line)
 */
export function formatErrorCompact(error: StructuredPythonError): string {
  const category = categorizeError(error.errorType);
  const icon = getErrorIcon(category);

  const location =
    error.stackFrames.length > 0 ? ` (line ${error.stackFrames[error.stackFrames.length - 1].line})` : "";

  return `${icon} ${error.errorType}: ${error.message}${location}`;
}
