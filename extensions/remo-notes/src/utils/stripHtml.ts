export function stripHtml(html: string): string {
  // Simple regex to strip HTML tags
  const plainText = html.replace(/<[^>]*>/g, " ");
  // Decode HTML entities (basic ones)
  return plainText
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}
