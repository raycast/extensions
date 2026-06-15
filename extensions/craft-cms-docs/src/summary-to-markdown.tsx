export function summaryHtmlToMarkdown(html: string): string {
  if (!html) return "";
  let s = html;

  s = s
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(?:div|section|article)>/gi, "\n\n");

  s = s.replace(
    /<a\b[^>]*\bhref\s*=\s*"(?:https?:\/\/(?:www\.)?craftcms\.com)?\/glossary\/([A-Za-z0-9-]+)\/?"[^>]*>([\s\S]*?)<\/a>/g,
    (_m, slug: string, text: string) => {
      const cleanText = escapeInlineCode(stripAllTags(text).trim() || slug);
      return `\`${cleanText}\``;
    },
  );

  s = s.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_m, attrs: string, inner: string) => {
    const hrefMatch = attrs.match(/\bhref\s*=\s*("([^"]*)"|'([^']*)')/i);
    const rawHref = hrefMatch?.[2] ?? hrefMatch?.[3];
    const href = normalizeHref(rawHref);
    const cleanText = stripAllTags(inner).trim();
    if (!cleanText) return "";
    if (!href) return cleanText;
    return `[${cleanText}](${href})`;
  });

  s = stripAllTags(s)
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return s;
}

function escapeInlineCode(input: string): string {
  return input.replace(/`/g, "\\`");
}

function normalizeHref(href: string | undefined): string | undefined {
  if (!href) return undefined;
  const value = href.trim();
  if (!value) return undefined;
  if (value.startsWith("http://") || value.startsWith("https://") || value.startsWith("raycast://")) return value;
  if (value.startsWith("/")) return `https://craftcms.com${value}`;
  return undefined;
}

function stripAllTags(input: string): string {
  return input
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&mdash;/g, "—")
    .replace(/&ndash;/g, "–")
    .replace(/&hellip;/g, "…")
    .replace(/&rsquo;|&lsquo;/g, "'")
    .replace(/&ldquo;|&rdquo;/g, '"')
    .replace(/&#(\d+);/g, (_match, code: string) => String.fromCodePoint(Number(code)));
}
