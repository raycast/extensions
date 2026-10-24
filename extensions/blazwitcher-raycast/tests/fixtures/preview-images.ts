export function previewImages(markdown: string) {
  return Array.from(
    markdown.matchAll(/data:image\/svg\+xml;base64,([A-Za-z0-9+/=]+)/g),
    (match) => Buffer.from(match[1], "base64").toString("utf8"),
  );
}

function plainText(html: string) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

export function previewText(svg: string) {
  return plainText(
    svg.replace(/<span class="source-tag"[^>]*>.*?<\/span>/g, ""),
  );
}

export function previewMatches(svg: string) {
  return Array.from(svg.matchAll(/<mark\b[^>]*>(.*?)<\/mark>/g), (match) =>
    plainText(match[1]),
  );
}
