export function escapeHtmlAttr(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function isValidImageUrl(url: string): boolean {
  return (
    typeof url === "string" &&
    (/^https:\/\/.*\.(png|jpe?g(_large)?|gif|webp|svg)$/.test(url) || url.startsWith("https://i.kym-cdn.com/photos"))
  );
}
