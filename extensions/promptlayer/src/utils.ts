import Mustache from "mustache";

/**
 * Extract variables from a template string
 * Supports both {{variable}} and {{{variable}}} syntax
 */
export function extractVariables(template: string): string[] {
  const variableRegex = /\{\{\{?([^}]+)\}?\}\}/g;
  const variables = new Set<string>();
  let match;

  while ((match = variableRegex.exec(template)) !== null) {
    const variable = match[1].trim();
    // Skip Mustache helpers and special syntax
    if (
      !variable.startsWith("#") &&
      !variable.startsWith("/") &&
      !variable.startsWith("^") &&
      !variable.startsWith("&")
    ) {
      variables.add(variable);
    }
  }

  return Array.from(variables);
}

/**
 * Render a template with variables using Mustache
 */
export function renderTemplate(
  template: string,
  variables: Record<string, string>,
): string {
  try {
    return Mustache.render(template, variables);
  } catch (error) {
    throw new Error(
      `Template rendering failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

/**
 * Format tags for display
 */
export function formatTags(tags?: string[]): string {
  if (!tags || tags.length === 0) return "";
  return tags.map((tag) => `#${tag}`).join(" ");
}

/**
 * Get folder/group info from metadata
 */
export function getPromptLocation(metadata?: Record<string, unknown>): string {
  if (!metadata) return "";

  const parts = [];
  if (metadata.folder) parts.push(metadata.folder);
  if (metadata.group) parts.push(metadata.group);

  return parts.length > 0 ? parts.join(" / ") : "";
}

/**
 * Truncate text for preview
 */
export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}
