/**
 * Extract variables from a prompt template
 * Supports {{variable}} syntax
 */
export function extractVariables(content: string): string[] {
  const variableRegex = /\{\{(\w+)\}\}/g;
  const variables = new Set<string>();

  let match;
  while ((match = variableRegex.exec(content)) !== null) {
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
 * Format tags for display
 */
export function formatTags(tags: Array<{ name: string }> | undefined): string {
  if (!tags || tags.length === 0) return "";
  return tags.map((tag) => `#${tag.name}`).join(" ");
}

/**
 * Truncate text for preview
 */
export function truncateText(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
}
