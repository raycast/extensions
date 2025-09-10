import { FormattingVariant } from "@/types";
import { messages } from "@/locale/en/messages";

/**
 * Formats a variant's content as markdown for display in the detail view.
 * Handles loading state for empty content and adds original input/prompt context.
 *
 * @param variant - The formatting variant to format
 * @returns The formatted markdown string
 */
/**
 * Helper function to format the context section (original input or prompt)
 */
function formatContext(variant: FormattingVariant): string {
  if (variant.originalInput) {
    return `> ${variant.originalInput}\n\n`;
  }
  if (variant.originalPrompt) {
    return `\`\`\`\n${variant.originalPrompt}\n\`\`\``;
  }
  return "";
}

export function formatVariantMarkdown(variant: FormattingVariant): string {
  const contextSection = formatContext(variant);
  const separator = "\n\n---\n\n";

  // Handle error state
  if (variant.error) {
    const errorSection = formatErrorSection(variant.error);
    return `${errorSection}${separator}${contextSection}`;
  }

  // Show loading state for empty content
  if (!variant.content) {
    return `⏳ ${messages.toast.generatingSingleVariant}${separator}${contextSection}`;
  }

  // Regular formatting for variants with content
  return `${variant.content}${separator}${contextSection}`;
}

/**
 * Helper function to format error information as markdown
 */
function formatErrorSection(error: FormattingVariant["error"]): string {
  if (!error) return "";

  const sections = [`# ${error.title}`, `\`\`\`${error.message}\`\`\``];

  if (error.suggestions && error.suggestions.length > 0) {
    sections.push(
      "",
      `**${messages.errorDisplay.suggestions}**\n`,
      ...error.suggestions.map((suggestion) => `- ${suggestion}`)
    );
  }

  let result = sections.join("\n\n");
  if (error.originalMessage) {
    result += `\n\n\`\`\`${error.originalMessage}\`\`\``;
  }

  return result;
}
