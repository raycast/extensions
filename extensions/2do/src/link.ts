import { BrowserExtension, environment } from "@raycast/api";
import { decode as decodeEntities } from "html-entities";

export type PageInfo = { title: string; description: string };

export const BROWSER_EXTENSION_URL = "https://www.raycast.com/browser-extension";

function decode(s: string) {
  return decodeEntities(s).replace(/\s+/g, " ").trim();
}

// Title from <title>, then og:title. Description from the meta tags pages set for search results
// and link previews; empty when the page has none.
export function parsePage(html: string): PageInfo {
  const meta: Record<string, string> = {};
  for (const [tag] of html.matchAll(/<meta\s[^>]*>/gi)) {
    const attrs = Object.fromEntries(
      [...tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(([, k, d, s]) => [k.toLowerCase(), d ?? s]),
    );
    const key = (attrs.name ?? attrs.property)?.toLowerCase();
    if (key && attrs.content && !(key in meta)) meta[key] = decode(attrs.content);
  }
  const title = decode(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "");
  return {
    title: title || meta["og:title"] || "",
    description: meta["description"] || meta["og:description"] || meta["twitter:description"] || "",
  };
}

// Same page, ignoring the scheme, "www.", a trailing slash, and the fragment.
export function samePage(a: string, b: string) {
  const key = (u: string) => {
    const url = new URL(u);
    url.hash = "";
    return url.href.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "");
  };
  return URL.canParse(a) && URL.canParse(b) && key(a) === key(b);
}

// Reads the page from a browser tab showing it, through the Raycast browser extension. The browser
// has already passed any bot check, so this works where fetchPage is blocked. Undefined when the
// extension is missing or unreachable, or no tab shows the page.
export async function readTab(url: string): Promise<PageInfo | undefined> {
  // Calling the API without the extension prompts the user to install it.
  if (!environment.canAccess(BrowserExtension)) return;
  try {
    const tab = (await BrowserExtension.getTabs()).find((t) => samePage(t.url, url));
    if (!tab) return;
    const page = parsePage(await BrowserExtension.getContent({ tabId: tab.id, cssSelector: "head", format: "html" }));
    return { title: page.title || tab.title || "", description: page.description };
  } catch {
    return;
  }
}

const BLOCKED = [401, 403, 429, 503];

// Throws with a message fit for a toast when the page can't be read or has no title.
export async function fetchPage(url: string): Promise<PageInfo> {
  let res: Response;
  try {
    res = await fetch(url, { signal: AbortSignal.timeout(10_000), headers: { Accept: "text/html" } });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError")
      throw new Error("Site took over 10 seconds to respond");
    const cause = error instanceof Error && error.cause instanceof Error ? error.cause.message : String(error);
    throw new Error(`Could not reach site (${cause})`);
  }
  if (!res.ok) {
    const status = `${res.status} ${res.statusText}`.trim();
    throw new Error(
      BLOCKED.includes(res.status) ? `Site refused (${status}); it may block automated requests` : status,
    );
  }
  const html = await res.text();
  // AWS WAF's JavaScript bot check, served with 202 (e.g. Goodreads).
  if (html.includes("awsWafCookieDomainList")) throw new Error("Site showed a bot check; it blocks automated requests");
  const page = parsePage(html);
  if (!page.title) throw new Error("No page title; the site may block automated requests or need JavaScript");
  return page;
}
