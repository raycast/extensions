/**
 * Helper functions for Shopify GraphQL Search
 */

// Helper function to convert string to title case
export function toTitleCase(text?: string): string {
  if (!text) return "";
  return text
    .toLowerCase()
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Helper function to convert HTML snippet to markdown
export function convertHtmlToMarkdown(html?: string): string {
  if (!html) return "";

  // Remove <p> tags but keep their content
  let markdown = html.replace(/<\/?p>/g, "");

  // Convert <strong> tags to markdown bold **
  markdown = markdown.replace(/<strong>(.*?)<\/strong>/g, "**$1** ");

  return markdown;
}

// Helper function to format breadcrumbs
export function formatBreadcrumbs(breadcrumb?: string, contentCategory?: string): string {
  if (!breadcrumb) return contentCategory || "";

  const parts = breadcrumb.split(" / ");
  // Skip the first 3 parts (docs / api / etc)
  const relevantParts = parts.length > 3 ? parts.slice(3) : parts;

  if (relevantParts.length === 0) return contentCategory || "";

  // Convert each part to title case
  const formattedParts = relevantParts.map((part) => toTitleCase(part));

  // Join with > and prefix with content_category
  return `${contentCategory || ""} > ${formattedParts.join(" > ")}`;
}
