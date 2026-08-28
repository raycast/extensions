export function stripHtml(html: string): string {
  const plainText = html.replace(/<[^>]*>/g, " ");
  return plainText
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}
