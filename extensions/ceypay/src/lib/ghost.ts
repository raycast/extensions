import { Parser } from "commonmark";
import type { BlogPost } from "./types";

/**
 * CeyPay runs Ghost headlessly: the Ghost instance at `blog.ceypay.io` is in
 * private mode, and posts are served publicly by the Next.js frontend at
 * `www.ceypay.io/blog`. Private mode gates the frontend, not the Content API,
 * so this key still reads published posts.
 *
 * This is a Content API key: read-only, serves published posts only, and
 * designed to be used from clients where it is visible. It is not the Admin API
 * key (`id:secret`), which grants writes and must never ship. Rotate it in
 * Ghost Admin → Integrations if it is ever abused.
 */
const CONTENT_API_KEY = "e40eee7081c2918b7f0807023d";
const API = "https://blog.ceypay.io/ghost/api/content";
const PUBLIC_BLOG = "https://www.ceypay.io/blog";

/**
 * `post.url` points at the private Ghost domain, which would show a login wall.
 *
 * The slug is remote content pasted into a URL that "Open in Browser" hands to
 * the reader's browser, so it is encoded: a real Ghost slug is unaffected, and
 * one carrying `?`, `#` or `..` can no longer reshape the link.
 */
export function publicPostUrl(slug: string): string {
  return `${PUBLIC_BLOG}/${encodeURIComponent(slug)}`;
}

export function publicTagUrl(slug: string): string {
  return `${PUBLIC_BLOG}/tag/${encodeURIComponent(slug)}`;
}

export function postsUrl(): string {
  const params = new URLSearchParams({
    key: CONTENT_API_KEY,
    limit: "all",
    include: "tags,authors",
    formats: "html",
    order: "published_at DESC",
  });
  return `${API}/posts/?${params}`;
}

type GhostTag = { name?: string; slug?: string };
type GhostAuthor = { name?: string };
type GhostPost = {
  id?: string;
  title?: string;
  slug?: string;
  excerpt?: string;
  custom_excerpt?: string;
  feature_image?: string | null;
  published_at?: string | null;
  reading_time?: number | null;
  html?: string;
  tags?: GhostTag[];
  authors?: GhostAuthor[];
};

export function parsePosts(body: unknown): BlogPost[] {
  const posts = (body as { posts?: GhostPost[] })?.posts;
  if (!Array.isArray(posts)) return [];

  return posts.map((post) => ({
    id: post.id ?? post.slug ?? "",
    title: post.title ?? "Untitled",
    slug: post.slug ?? "",
    excerpt: (post.custom_excerpt || post.excerpt || "").replace(/\s+/g, " ").trim(),
    featureImage: post.feature_image ?? undefined,
    publishedAt: post.published_at ?? undefined,
    readingTime: post.reading_time ?? undefined,
    html: post.html ?? "",
    tags: (post.tags ?? []).flatMap((tag) => (tag.name ? [{ name: tag.name, slug: tag.slug ?? "" }] : [])),
    authors: (post.authors ?? []).flatMap((author) => (author.name ? [author.name] : [])),
  }));
}

export function formatPublished(value: string | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  hellip: "…",
  mdash: "—",
  ndash: "–",
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
};

function decodeEntities(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_m, dec: string) => String.fromCodePoint(Number(dec)))
    .replace(/&([a-z]+);/gi, (match, name: string) => ENTITIES[name.toLowerCase()] ?? match);
}

/**
 * Raycast renders a markdown image at its intrinsic size, so a full-resolution
 * screenshot fills the whole pane. `raycast-width` caps it — but passing width
 * alone makes Raycast choose the height itself and crop, so both are always
 * given, scaled from the image's declared dimensions to keep its proportions.
 */
const IMAGE_WIDTH = 520;

function sizedImage(url: string, width?: number, height?: number): string {
  // Without real dimensions any height would be a guess, and a wrong guess
  // crops. Better to let Raycast scale the image than to crop it.
  if (!width || !height) return url;

  const scaled = Math.min(IMAGE_WIDTH, width);
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}raycast-width=${scaled}&raycast-height=${Math.round((scaled * height) / width)}`;
}

/** Pulls the `width`/`height` attributes Ghost writes onto content images. */
function imageDimensions(tag: string): { width?: number; height?: number } {
  const width = Number(tag.match(/\bwidth="(\d+)"/)?.[1]);
  const height = Number(tag.match(/\bheight="(\d+)"/)?.[1]);
  return { width: width || undefined, height: height || undefined };
}

/**
 * Ghost content is remote, and rendering an image is itself a request: an image
 * URL from a published — or compromised — post makes Raycast contact whatever
 * host it names. Every image in the blog therefore has to come from a host named
 * here, whether it is the feature image or one embedded in the post body.
 *
 * An allowlist rather than a rule about which hosts look private, because a
 * hostname does not tell you where it points: `127.0.0.1.nip.io` is an ordinary
 * public name that resolves to loopback, and resolving it here would not settle
 * it either — Raycast makes the real request later, and the answer can change in
 * between. Naming the hosts is the only check that does not depend on
 * resolution.
 *
 * Nothing is lost by being strict: every image that renders across the live blog
 * is already served from one of these. Third-party images do appear in posts, but
 * only inside bookmark cards, which are unwrapped to a plain link well before any
 * image is emitted. Add a host here if the blog ever serves images from a new
 * one.
 */
const IMAGE_HOSTS = new Set([
  "blog.ceypay.io",
  "www.ceypay.io",
  "ceypay.io",
  "digitalpress.fra1.cdn.digitaloceanspaces.com",
  "assets.staticimg.com",
]);

/**
 * The one gate for every image sink: the grid thumbnail, the detail hero, the
 * images in the post body, and the size probe. An unrecognised host is never
 * contacted — the image is dropped, or the post falls back to a brand glyph,
 * rather than showing as broken.
 */
export function isTrustedImage(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && IMAGE_HOSTS.has(parsed.hostname);
  } catch {
    return false;
  }
}

/** A markdown image, or nothing at all when its host must not be contacted. */
function markdownImage(src: string, width?: number, height?: number): string {
  return isTrustedImage(src) ? `![](${sizedImage(src, width, height)})` : "";
}

/* ------------------------------------------------------------------ *
 * The image gate over the finished Markdown
 *
 * Gating each `<img>` on the way through is not enough on its own: the
 * document is Markdown by the time Raycast sees it, and an image can reach it
 * as text rather than as a tag — a title, caption or tag name that is itself
 * image syntax. Reading that text back with the same parser Raycast's renderer
 * follows is the only way to see every image it will actually fetch, reference
 * images included: `![alt][label]` names no URL at the point of use, so the
 * destination only appears once a parser has paired it with its definition.
 * ------------------------------------------------------------------ */

/** Every destination CommonMark resolves for an image, references included. */
function imageDestinations(markdown: string): string[] {
  const walker = new Parser().parse(markdown).walker();
  const destinations: string[] = [];
  for (let event = walker.next(); event; event = walker.next()) {
    if (event.entering && event.node.type === "image") destinations.push(event.node.destination ?? "");
  }
  return destinations;
}

type InlineImage = { destination: string; end: number };

/**
 * Reads `![alt](destination "title")` starting at `![`, the way CommonMark does:
 * brackets nest, so the label of `![a[b]](…)` runs to its own closing bracket
 * rather than the first one, and a `<…>` destination may hold spaces.
 */
function readInlineImage(source: string, start: number): InlineImage | undefined {
  let i = start + 2;
  for (let depth = 1; i < source.length && depth > 0; i++) {
    if (source[i] === "\\") i++;
    else if (source[i] === "[") depth++;
    else if (source[i] === "]") depth--;
  }
  if (source[i] !== "(") return undefined;

  i++;
  while (i < source.length && /\s/.test(source[i])) i++;

  let destination = "";
  if (source[i] === "<") {
    for (i++; i < source.length && source[i] !== ">"; i++) {
      if (source[i] === "\\") i++;
      destination += source[i];
    }
    i++;
  } else {
    for (let depth = 0; i < source.length && !/\s/.test(source[i]); i++) {
      if (source[i] === "\\") i++;
      else if (source[i] === "(") depth++;
      else if (source[i] === ")" && depth-- === 0) break;
      destination += source[i];
    }
  }

  // Past the destination sits an optional title, then the closing paren.
  for (; i < source.length; i++) {
    if (source[i] === "\\") i++;
    else if (source[i] === ")") return { destination, end: i + 1 };
  }
  return undefined;
}

/**
 * Reads a document line by line and says whether each one is code, so a scan can
 * step over fenced blocks without touching them.
 *
 * A fence closes only on a run of its own character at least as long as the one
 * that opened it, and on a line carrying nothing else. Both rules matter here:
 * wrapping a sample in a longer fence is how a post shows ``` in the first
 * place, and an inner ```js opens a nested sample rather than ending the block.
 */
function fenceTracker(): (line: string) => boolean {
  let fence = "";

  return (line) => {
    const run = line.match(/^\s{0,3}(`{3,}|~{3,})/)?.[1];
    if (fence) {
      const closes = run && run[0] === fence[0] && run.length >= fence.length;
      if (closes && /^\s{0,3}(`{3,}|~{3,})[ \t]*$/.test(line)) fence = "";
      return true;
    }
    if (run) fence = run;
    return Boolean(run);
  };
}

/**
 * Rewrites the prose of a document and leaves its code alone. Image syntax
 * inside a fenced block or a code span is a sample — writing about an image
 * rather than showing one — so the renderer never fetches it and editing it
 * would corrupt a code sample the post meant to display.
 */
function mapProse(markdown: string, rewrite: (prose: string) => string): string {
  const isCode = fenceTracker();

  return markdown
    .split("\n")
    .map((line) => {
      if (isCode(line)) return line;
      // Splitting on a captured pattern interleaves the parts: the code spans
      // land on the odd indices, the prose between them on the even ones.
      return line
        .split(/(`+[^`]*`+)/)
        .map((part, index) => (index % 2 === 0 ? rewrite(part) : part))
        .join("");
    })
    .join("\n");
}

/** Drops inline images whose destination is not one the reader may contact. */
function removeInlineImages(markdown: string, untrusted: (destination: string) => boolean): string {
  return mapProse(markdown, (prose) => {
    let out = "";
    let cursor = 0;

    for (let start = prose.indexOf("!["); start !== -1; start = prose.indexOf("![", cursor)) {
      out += prose.slice(cursor, start);
      const image = readInlineImage(prose, start);
      if (!image) {
        // Not an inline image after all — keep the `![` and carry on past it.
        out += "![";
        cursor = start + 2;
        continue;
      }
      if (!untrusted(image.destination)) out += prose.slice(start, image.end);
      cursor = image.end;
    }

    return out + prose.slice(cursor);
  });
}

/**
 * Drops the link reference definitions that point somewhere untrusted, which is
 * what makes `![alt][label]` resolve. Without its definition the reference is no
 * longer a link of any kind and renders as the literal text it looks like.
 *
 * Definitions inside a fenced block are sample text rather than markup, so the
 * fences are tracked and their contents left alone.
 */
function removeReferenceDefinitions(markdown: string, untrusted: (destination: string) => boolean): string {
  const isCode = fenceTracker();

  return markdown
    .split("\n")
    .filter((line) => {
      if (isCode(line)) return true;
      const destination = line.match(/^ {0,3}\[(?:[^\]\\]|\\.)+\]:\s*<?([^\s>]+)>?/)?.[1];
      return !destination || !untrusted(destination);
    })
    .join("\n");
}

/**
 * Holds every image in the finished document to `IMAGE_HOSTS`, whichever syntax
 * it arrived in. The parser has the last word: if an untrusted destination is
 * still reachable after the targeted removals, image syntax is escaped across
 * the document's prose, so the worst case is an image rendered as the text that
 * describes it and never a request to a host that was not named here.
 */
export function gateImages(markdown: string): string {
  const untrusted = (destination: string) => !isTrustedImage(destination);

  let out = markdown;
  if (imageDestinations(out).some(untrusted)) {
    out = removeReferenceDefinitions(out, untrusted);
    out = removeInlineImages(out, untrusted);
  }

  if (!imageDestinations(out).some(untrusted)) return out;
  return mapProse(out, (prose) => prose.replace(/!\[/g, "!\\["));
}

export type ImageSize = { width: number; height: number };

/**
 * The Content API gives no dimensions for `feature_image`, and sizing it without
 * them crops. Every format used here declares its size in the first bytes of the
 * file, so a ranged request is enough to read it without downloading the image.
 */
export function readImageSize(bytes: Uint8Array): ImageSize | undefined {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const ascii = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end));

  if (bytes.length > 24 && view.getUint32(0) === 0x89504e47) {
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }

  if (bytes.length > 30 && ascii(8, 12) === "WEBP") {
    const format = ascii(12, 16);
    if (format === "VP8X") {
      const read24 = (o: number) => bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16);
      return { width: read24(24) + 1, height: read24(27) + 1 };
    }
    if (format === "VP8 ") {
      return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff };
    }
    if (format === "VP8L") {
      const bits = view.getUint32(21, true);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }

  if (bytes.length > 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) {
        i++;
        continue;
      }
      const marker = bytes[i + 1];
      // SOF0–SOF15 carry the frame size; DHT/JPG/DAC in that range do not.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: view.getUint16(i + 5), width: view.getUint16(i + 7) };
      }
      i += 2 + view.getUint16(i + 2);
    }
  }

  return undefined;
}

/**
 * Ghost returns Koenig-editor HTML. Raycast's `Detail` renders Markdown, so the
 * card structures (images with captions, bookmark cards) need unwrapping rather
 * than stripping — otherwise the post loses its illustrations and link cards.
 */
export function postToMarkdown(post: BlogPost, heroSize?: ImageSize): string {
  let out = post.html;

  // Bookmark cards: a nested div soup wrapping one link. Keep the link.
  out = out.replace(/<figure[^>]*kg-bookmark-card[\s\S]*?<\/figure>/gi, (card) => {
    const href = card.match(/href="([^"]*)"/i)?.[1];
    const title = card.match(/kg-bookmark-title"[^>]*>([\s\S]*?)</i)?.[1]?.trim();
    return href ? `\n\n[${decodeEntities(title || href)}](${href})\n\n` : "";
  });

  // Image cards: pull the image out, then its caption as emphasis beneath.
  out = out.replace(/<figure[^>]*>([\s\S]*?)<\/figure>/gi, (figure, inner: string) => {
    const tag = inner.match(/<img[^>]*>/i)?.[0] ?? "";
    const src = tag.match(/src="([^"]*)"/i)?.[1];
    const caption = inner.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1];
    if (!src) return "";
    const { width, height } = imageDimensions(tag);
    const text = caption ? `\n*${decodeEntities(caption.replace(/<[^>]+>/g, "").trim())}*` : "";
    const image = markdownImage(src, width, height);
    // A dropped image keeps its caption: the caption is text, not a request.
    if (!image) return text ? `\n\n${text.trim()}\n\n` : "";
    return `\n\n${image}${text}\n\n`;
  });

  out = out
    .replace(/<pre[^>]*>\s*<code[^>]*>([\s\S]*?)<\/code>\s*<\/pre>/gi, (_m, code: string) => {
      return `\n\`\`\`\n${decodeEntities(code.replace(/<[^>]+>/g, "")).trim()}\n\`\`\`\n`;
    })
    // The post title is already the document's H1, so shift content headings down.
    .replace(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi, (_m, level: string, text: string) => {
      return `\n\n${"#".repeat(Math.min(6, Number(level) + 1))} ${text.replace(/<[^>]+>/g, "").trim()}\n\n`;
    })
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, (_m, text: string) => {
      return `\n> ${text.replace(/<[^>]+>/g, "").trim()}\n`;
    })
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, (_m, text: string) => `- ${text.trim()}\n`)
    .replace(/<\/?(ul|ol)[^>]*>/gi, "\n")
    .replace(/<(strong|b)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, text: string) => `**${text.trim()}**`)
    .replace(/<(em|i)[^>]*>([\s\S]*?)<\/\1>/gi, (_m, _t, text: string) => `*${text.trim()}*`)
    .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, (_m, text: string) => `\`${text.trim()}\``)
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, text: string) => {
      return `[${text.replace(/<[^>]+>/g, "").trim()}](${href})`;
    })
    .replace(/<img[^>]*>/gi, (tag: string) => {
      const src = tag.match(/src="([^"]*)"/i)?.[1];
      if (!src) return "";
      const { width, height } = imageDimensions(tag);
      const image = markdownImage(src, width, height);
      return image ? `\n${image}\n` : "";
    })
    .replace(/<hr[^>]*>/gi, "\n\n---\n\n")
    .replace(/<br\s*\/?>/gi, "  \n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "");

  // A pushed `Detail` does not render `navigationTitle` in the navigation bar,
  // so the document has to carry the headline itself or the post opens untitled.
  const byline = [
    formatPublished(post.publishedAt),
    post.readingTime ? `${post.readingTime} min read` : "",
    post.authors.length > 0 ? post.authors.join(", ") : "",
    post.tags.length > 0 ? post.tags.map((tag) => tag.name).join(", ") : "",
  ]
    .filter(Boolean)
    .join(" · ");

  // The hero is the feature image, so it is held to the stricter allowlist.
  const hero = isTrustedImage(post.featureImage)
    ? `![](${sizedImage(post.featureImage, heroSize?.width, heroSize?.height)})`
    : "";

  const header = [`# ${post.title}`, byline ? `*${byline}*` : "", hero].filter(Boolean).join("\n\n");

  // Blank line between header and body: a single newline would fold the feature
  // image and the opening paragraph into one block.
  const document = [header, decodeEntities(out)]
    .filter(Boolean)
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/^(\s*- .*)\n\n(?=\s*- )/gm, "$1\n")
    .trim();

  // Every `<img>` is gated on the way through; this reads the finished document
  // back as Markdown to catch the images that arrived as text instead.
  return gateImages(document);
}
