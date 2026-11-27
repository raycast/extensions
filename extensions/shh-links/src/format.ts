// Angle brackets around a URL stop Discord from adding a preview embed:
// [text](<url>) is a masked link, <url> a bare one.

export function isUrl(value: string): boolean {
  return /^https?:\/\/\S+$/.test(value);
}

// The URL in a clipboard value, or "" when there is none. A failed paste can leave
// [text](<url>) or <url> on the clipboard, so that formatting is undone first.
export function cleanUrl(value: string | undefined): string {
  let s = (value ?? "").trim();
  const masked = s.match(/^\[.*\]\((.*)\)$/s);
  if (masked) s = masked[1];
  if (s.startsWith("<") && s.endsWith(">")) s = s.slice(1, -1);
  return isUrl(s) ? s : "";
}

// The text of a clipboard value that is one masked link, [docs](url) giving "docs",
// with the escaping undone so it is not escaped twice. "" for anything else.
export function maskedText(value: string | undefined): string {
  const masked = (value ?? "").trim().match(/^\[(.*)\]\((.*)\)$/s);
  if (!masked || !cleanUrl(value)) return "";
  return masked[1].replace(/\\([\\[\]*_~`|])/g, "$1");
}

const URL_IN_TEXT = /https?:\/\/[^\s<>]+/g;

// A URL found in prose ends before trailing punctuation and before a ")" it did not
// open: "(see https://a.com)" and "[a](https://a.com)" end at .com, a_(b) keeps its ")"
function trimUrl(url: string): string {
  let end = url.length;
  while (end > 0) {
    const last = url[end - 1];
    const kept = url.slice(0, end);
    const unbalanced = last === ")" && kept.split(")").length > kept.split("(").length;
    if (!".,;:!?'\"".includes(last) && !unbalanced) break;
    end--;
  }
  return url.slice(0, end);
}

// In [text](url) the URL ends at the ")" that closes the link, so trailing punctuation
// belongs to it: [a](https://a.com/?q=wow!). undefined when that ")" is missing.
function maskedEnd(url: string): number | undefined {
  let depth = 0;
  for (let i = 0; i < url.length; i++) {
    if (url[i] === "(") depth++;
    else if (url[i] === ")" && depth-- === 0) return i;
  }
  return undefined;
}

export function countUrls(content: string): number {
  return content.match(URL_IN_TEXT)?.length ?? 0;
}

export type FormatOptions = {
  // A link with no text is named after its site: [bchagas](<url>)
  named?: boolean;
  // Tracking parameters (utm_*, fbclid…) are dropped from every link
  untrack?: boolean;
};

const TRACKING =
  /^(utm_.+|fbclid|gclid|gclsrc|gbraid|wbraid|dclid|msclkid|mc_cid|mc_eid|igshid|igsh|yclid|twclid|ttclid|_hsenc|_hsmi|mkt_tok)$/i;

// Drops tracking parameters and keeps everything else exactly as written: rebuilding
// the URL with new URL() would re-encode parts of it
export function stripTracking(url: string): string {
  const hash = url.indexOf("#");
  const fragment = hash < 0 ? "" : url.slice(hash);
  const beforeHash = hash < 0 ? url : url.slice(0, hash);
  const q = beforeHash.indexOf("?");
  if (q < 0) return url;
  const kept = beforeHash
    .slice(q + 1)
    .split("&")
    .filter((param) => param && !TRACKING.test(param.split("=")[0]));
  return beforeHash.slice(0, q) + (kept.length ? `?${kept.join("&")}` : "") + fragment;
}

// Backslashes Discord's formatting characters so the text shows as typed: brackets
// would end the masked link early, the rest would turn into bold, spoilers and so on
function escapeText(text: string): string {
  return text.replace(/[\\[\]*_~`|]/g, "\\$&");
}

const DISCORD_LIMIT = 2000;

// A message over Discord's limit cannot be sent (Nitro raises it to 4000)
export function lengthWarning(content: string): string | undefined {
  if (content.length <= DISCORD_LIMIT) return undefined;
  return `${content.length} characters: over Discord's ${DISCORD_LIMIT} limit (4000 with Nitro)`;
}

// Second-level suffixes where the site name is one label further left: exemplo.com.br
const SECOND_LEVEL = /^(com|net|org|gov|edu|co|ac|ne|or|go)$/;

// The site's name for a link text: the domain without "www.", subdomains or suffix,
// in lowercase (https://www.bchagas.com/… gives bchagas). "" when the URL is invalid.
export function siteName(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    return "";
  }
  if (/^[\d.]+$/.test(host) || host.includes(":")) return host;
  const labels = host.split(".");
  let i = labels.length - 2;
  if (i > 0 && labels[labels.length - 1].length === 2 && SECOND_LEVEL.test(labels[i])) i--;
  const name = labels[Math.max(i, 0)];
  return name.toLowerCase();
}

// Wraps every URL in the content in angle brackets and leaves the rest as it is.
// A URL right after "<" is already wrapped; [text](url) becomes [text](<url>).
// named: a bare URL becomes [site](<url>) instead of <url>, and a site name that
// repeats is numbered (bchagas 1, bchagas 2) so the links can be told apart.
export function wrapUrls(content: string, { named = false, untrack = false }: FormatOptions = {}): string {
  const found = [...content.matchAll(URL_IN_TEXT)].map((m) => {
    const offset = m.index;
    const wrapped = content[offset - 1] === "<";
    const masked = content.slice(offset - 2, offset) === "](";
    const end = masked ? maskedEnd(m[0]) : undefined;
    const trimmed = end === undefined ? trimUrl(m[0]) : m[0].slice(0, end);
    const url = untrack ? stripTracking(trimmed) : trimmed;
    return { url, rest: m[0].slice(trimmed.length), wrapped, name: named && !wrapped && !masked ? siteName(url) : "" };
  });

  const total = new Map<string, number>();
  for (const { name } of found) if (name) total.set(name, (total.get(name) ?? 0) + 1);
  const seen = new Map<string, number>();

  let i = 0;
  return content.replace(URL_IN_TEXT, (match) => {
    const { url, rest, wrapped, name } = found[i++];
    if (wrapped) return match;
    if (!name) return `<${url}>${rest}`;
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    const label = total.get(name)! > 1 ? `${name} ${n}` : name;
    return `[${escapeText(label)}](<${url}>)${rest}`;
  });
}

// What gets pasted: the text applies to a single URL, which keeps its own text when it
// is a masked link; content with several URLs (a list of links, a message) has each
// one wrapped and the text ignored.
export function formatContent(text: string, content: string, options: FormatOptions = {}): string | undefined {
  let single = cleanUrl(content);
  if (single) {
    if (options.untrack) single = stripTracking(single);
    return formatLink(text || maskedText(content) || (options.named ? siteName(single) : ""), single);
  }
  if (!content.trim()) {
    const typed = text.trim();
    return formatLink("", options.untrack && isUrl(typed) ? stripTracking(typed) : typed);
  }
  return countUrls(content) ? wrapUrls(content.trim(), options) : undefined;
}

// undefined when there is no valid URL. A URL typed as the text, with no URL given,
// is the link itself.
export function formatLink(text: string, url: string): string | undefined {
  let label = text.trim();
  let link = url.trim();
  if (!link && isUrl(label)) {
    link = label;
    label = "";
  }
  if (!isUrl(link)) return undefined;
  if (!label) return `<${link}>`;
  return `[${escapeText(label)}](<${link}>)`;
}

// Text selected in Discord: words become the link text; a selection holding links is
// the content to wrap instead
export function fromSelection(selection: string): { text: string; urls: string } {
  const s = selection.trim();
  if (countUrls(s)) return { text: "", urls: s };
  return { text: s.replace(/\s+/g, " "), urls: "" };
}
