/**
 * The site's own name for a target, read off the page itself. `brandFor` only ever sees the domain,
 * so `sendtestemail.com` can only ever become `Sendtestemail` — while the page says `SendTestEmail`
 * in its own metadata. Anything here can fail — offline, intranet, a page with no metadata — and
 * every failure is undefined, leaving the domain-derived suggestion in place.
 */

const FETCH_TIMEOUT_MS = 3000;

/** Only the head is ever read — the name, if there is one, is always in it. */
const MAX_HTML_LENGTH = 64 * 1024;

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

const decodeEntities = (value: string) =>
  value.replace(/&(amp|lt|gt|quot|apos|nbsp|#[0-9]+|#[xX][0-9a-fA-F]+);/g, (match, body: string) => {
    const named = NAMED_ENTITIES[body];
    if (named !== undefined) return named;

    const code =
      body.startsWith("#x") || body.startsWith("#X") ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
    return Number.isNaN(code) ? match : String.fromCodePoint(code);
  });

const attributeOf = (tag: string, name: string) =>
  tag
    .match(new RegExp(`${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"))
    ?.slice(2, 5)
    .find(Boolean);

const metaContent = (html: string, key: "property" | "name", value: string) => {
  for (const tag of html.match(/<meta\b[^>]*>/gi) ?? []) {
    if (attributeOf(tag, key)?.toLowerCase() === value) {
      const content = attributeOf(tag, "content");
      if (content?.trim()) return decodeEntities(content).trim();
    }
  }

  return undefined;
};

const TITLE_SEPARATORS = /\s+(?:\||-|–|—|·)\s+/;

/** `Free Test Email | SendTestEmail.com` names the page first and the site last — the site is the brand. */
const siteFromTitle = (html: string) => {
  const raw = html.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1];
  if (!raw) return undefined;

  const last = decodeEntities(raw)
    .split(TITLE_SEPARATORS)
    .map((part) => part.trim())
    .filter(Boolean)
    .at(-1);
  if (!last) return undefined;

  // A trailing host (`SendTestEmail.com`) is an address, not a name — the name is what precedes it.
  const withoutTld = last.replace(/\.[a-z]{2,}$/i, "");

  return withoutTld.trim() || undefined;
};

/** `og:site_name`, then `application-name`, then the site end of `<title>` — the first one that names anything. */
export const parseSiteName = (html: string) =>
  metaContent(html, "property", "og:site_name") ?? metaContent(html, "name", "application-name") ?? siteFromTitle(html);

export const fetchSiteName = async (target: string): Promise<string | undefined> => {
  const trimmed = target.trim();
  if (!/^https?:\/\//i.test(trimmed)) return undefined;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return undefined;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    if (!response.ok) return undefined;

    return parseSiteName((await response.text()).slice(0, MAX_HTML_LENGTH));
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
};
