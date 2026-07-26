export function absolutizeDomLinksAndImages(
  document: Document,
  baseUrl: string,
) {
  for (const el of Array.from(document.querySelectorAll("a[href]"))) {
    const href = el.getAttribute("href");
    if (!href || isSkippableUrl(href)) continue;
    try {
      el.setAttribute("href", new URL(href, baseUrl).toString());
    } catch {
      // ignore
    }
  }

  for (const el of Array.from(document.querySelectorAll("img[src]"))) {
    const src = el.getAttribute("src");
    if (!src || isSkippableUrl(src)) continue;
    try {
      el.setAttribute("src", new URL(src, baseUrl).toString());
    } catch {
      // ignore
    }
  }
}

function isSkippableUrl(url: string) {
  return (
    url.startsWith("#") ||
    url.startsWith("javascript:") ||
    url.startsWith("mailto:")
  );
}
