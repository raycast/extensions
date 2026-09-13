// Anything reachable from a converted page is attacker-controlled: the Markdown
// is rendered in Raycast, put on the clipboard, and written to a file that other
// renderers will open later. So resolve URLs against the page, then keep only
// the schemes that are meaningful in a Markdown document.
const SAFE_LINK_SCHEMES = new Set(["http:", "https:", "mailto:"]);
const SAFE_IMAGE_SCHEMES = new Set(["http:", "https:"]);

export function absolutizeAndSanitizeUrls(document: Document, baseUrl: string) {
  for (const el of Array.from(document.querySelectorAll("a[href]"))) {
    const href = el.getAttribute("href");
    if (!href) continue;

    // Same-page anchors have no scheme to vet and stay useful as-is.
    if (href.startsWith("#")) continue;

    const resolved = resolveUrl(href, baseUrl);
    if (resolved && SAFE_LINK_SCHEMES.has(schemeOf(resolved))) {
      el.setAttribute("href", resolved);
    } else {
      // Drop the link, keep the words: unlinking loses far less than
      // discarding the element would.
      el.removeAttribute("href");
    }
  }

  for (const el of Array.from(document.querySelectorAll("img[src]"))) {
    const src = el.getAttribute("src");
    const resolved = src ? resolveUrl(src, baseUrl) : null;

    if (resolved && SAFE_IMAGE_SCHEMES.has(schemeOf(resolved))) {
      el.setAttribute("src", resolved);
    } else {
      // Strip the attribute rather than the element. Lazy-loaded images carry a
      // base64 spacer in src and the real URL in data-src, which Readability
      // promotes after this pass — removing the element would discard the image
      // outright. With no src left, Turndown emits nothing for it anyway.
      el.removeAttribute("src");
    }
  }
}

function resolveUrl(url: string, baseUrl: string): string | null {
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return null;
  }
}

function schemeOf(url: string): string {
  try {
    return new URL(url).protocol.toLowerCase();
  } catch {
    return "";
  }
}
