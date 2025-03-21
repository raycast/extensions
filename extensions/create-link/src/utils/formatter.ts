function sanitizeForHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function sanitizeUrl(url: string): string {
  try {
    new URL(url);
    return url;
  } catch {
    return "about:blank";
  }
}

export function generateHTML(title: string, url: string): string {
  const safeTitle = sanitizeForHtml(title || "");
  const safeUrl = sanitizeUrl(url);
  const htmlLink = `<a href="${safeUrl}">${safeTitle}</a>`;
  return htmlLink;
}

function sanitizeForMarkdown(text: string): string {
  // Escape markdown special characters: [ ] ( ) ` * _ { } # + - . !
  return text.replace(/([[\]()"`*_{}\\#+\-.!])/g, "\\$1");
}

export function generateMarkdown(title: string, url: string): string {
  const safeTitle = sanitizeForMarkdown(title || "");
  const safeUrl = sanitizeUrl(url);
  const markdownLink = `[${safeTitle}](${safeUrl})`;
  return markdownLink;
}
