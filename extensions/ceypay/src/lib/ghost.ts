import { Parser, type Node, type Position } from "commonmark";
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
 *
 * The tree the parser returns answers the other half of it too. Which text is
 * code is not a question a pattern can settle: a backtick and a run of two
 * never close each other, so text between them reads as a code span while the
 * parser is resolving an image inside it. Both questions are put to the tree
 * here, and the blocks that offend are written back out of it.
 * ------------------------------------------------------------------ */

function parse(markdown: string): Node {
  return new Parser().parse(markdown);
}

/**
 * Where a node sits in the source. commonmark records this while it parses, and
 * only for blocks: an inline node has no position of its own, so this is also
 * how a block is told from what it contains.
 */
function positionOf(node: Node): Position | undefined {
  return node.sourcepos;
}

/**
 * Whether the renderer would be sent to a host because of this node.
 *
 * An image is judged on the destination the parser resolved for it, which for a
 * reference image is the only place one is ever stated. Raw HTML is never
 * trusted: the document is Markdown by now, so a tag inside it arrived as text,
 * and whether it fetches anything is the renderer's decision rather than ours.
 *
 * Code is absent from this list, and that is the point of reading the tree. A
 * code span or a code block holds no image node and no HTML node however much
 * image syntax it displays, so a sample a post means to show — fenced, indented
 * or inline — is never mistaken for a request and never touched.
 */
function fetches(node: Node): boolean {
  if (node.type === "html_inline" || node.type === "html_block") return true;
  return node.type === "image" && !isTrustedImage(node.destination ?? undefined);
}

/** The leaf blocks carrying something the reader must not be made to fetch. */
function offendingBlocks(document: Node): Node[] {
  const blocks: Node[] = [];
  const walker = document.walker();

  for (let event = walker.next(); event; event = walker.next()) {
    if (!event.entering || !fetches(event.node)) continue;

    // An inline node states no position of its own, so the leaf block holding
    // it is the unit that gets rewritten.
    let block: Node | null = event.node;
    while (block && !positionOf(block)) block = block.parent;
    if (block && !blocks.includes(block)) blocks.push(block);
  }

  return blocks;
}

/**
 * Text out of the tree goes back in as text: every character that could open
 * markup is escaped, so a rewritten block renders what it reads and can never
 * grow an image it did not already have. `!` is escaped along with the rest —
 * a `\!` the post wrote as text sits next to a link in the tree, and the two
 * put back unescaped would spell an image between them.
 */
function escapeText(text: string): string {
  return text.replace(/[\\`*_[\]<>&!~|]/g, "\\$&");
}

/**
 * A code span wide enough to hold its own content: the fence has to outrun the
 * longest run of backticks inside it, and content that begins or ends with a
 * backtick — or with a space at both ends — needs the padding space CommonMark
 * strips back off when it reads the span.
 */
function renderCode(literal: string): string {
  const runs = (literal.match(/`+/g) ?? []).map((run) => run.length);
  const fence = "`".repeat(Math.max(0, ...runs) + 1);
  const spaced = literal.startsWith(" ") && literal.endsWith(" ") && literal.trim() !== "";
  const padding = /^`|`$/.test(literal) || spaced ? " " : "";
  return `${fence}${padding}${literal}${padding}${fence}`;
}

/** Whether a destination can be written without the angle brackets. */
function isBareDestination(destination: string): boolean {
  if (destination === "" || /[\s<>\\]/.test(destination)) return false;

  // Parens may stand unescaped only while they balance.
  let depth = 0;
  for (const character of destination) {
    if (character === "(") depth++;
    else if (character === ")" && --depth < 0) return false;
  }
  return depth === 0;
}

/** A destination and title as the link or image they came from would write them. */
function renderTarget(node: Node): string {
  const destination = node.destination ?? "";
  const written = isBareDestination(destination) ? destination : `<${destination.replace(/[<>\\]/g, "\\$&")}>`;
  return written + (node.title ? ` "${node.title.replace(/["\\]/g, "\\$&")}"` : "");
}

function renderChildren(parent: Node): string {
  let out = "";
  for (let child = parent.firstChild; child; child = child.next) out += renderInline(child);
  return out;
}

/** One inline node, written back as the Markdown that would parse to it. */
function renderInline(node: Node): string {
  switch (node.type) {
    case "code":
      return renderCode(node.literal ?? "");
    case "emph":
      return `*${renderChildren(node)}*`;
    case "strong":
      return `**${renderChildren(node)}**`;
    case "link":
      // A link is a destination the reader chooses to open, not one the
      // renderer fetches, so it is carried across as it was.
      return `[${renderChildren(node)}](${renderTarget(node)})`;
    case "image":
      // A dropped image leaves nothing behind: its alt text describes a picture
      // that is not there.
      return fetches(node) ? "" : `![${renderChildren(node)}](${renderTarget(node)})`;
    case "softbreak":
    case "linebreak":
      // Both go back as a space, so a rewritten block returns on a single line
      // and a break can never land where a new block would start.
      return " ";
    default:
      // Text, and raw HTML, which is text here for the reason `fetches` gives.
      return escapeText(node.literal ?? "");
  }
}

/**
 * The container markers a block sits behind — a quote's `>`, a list item's
 * bullet, the indent beneath either. A tab advances to the next stop of four,
 * the way the parser counted the columns it reported.
 */
function blockIndent(line: string, column: number): string {
  let at = 1;
  let index = 0;
  for (; index < line.length && at < column; index++) at += line[index] === "\t" ? 4 - ((at - 1) % 4) : 1;
  return line.slice(0, index);
}

/** One block, written back from its own subtree, minus the images it may not show. */
function renderBlock(block: Node, indent: string): string[] {
  const body =
    block.type === "heading"
      ? `${"#".repeat(block.level)} ${renderChildren(block)}`
      : block.type === "html_block"
        ? escapeText((block.literal ?? "").replace(/\n+$/, ""))
        : renderChildren(block);

  // An HTML block is the only kind that still spans lines once it is text.
  const continuation = indent.replace(/\S/g, " ");
  return body.split("\n").map((line, index) => (index === 0 ? indent : continuation) + line);
}

/** Puts each offending block back as the Markdown its own subtree describes. */
function rewriteBlocks(markdown: string, blocks: Node[]): string {
  const lines = markdown.split("\n");

  // Last block first, so the line numbers the parser reported for the earlier
  // ones still point where they did.
  for (const block of [...blocks].sort((a, b) => b.sourcepos[0][0] - a.sourcepos[0][0])) {
    const [[first, column], [last]] = block.sourcepos;
    lines.splice(first - 1, last - first + 1, ...renderBlock(block, blockIndent(lines[first - 1] ?? "", column)));
  }

  return lines.join("\n");
}

/**
 * Holds every image in the finished document to `IMAGE_HOSTS`, whichever syntax
 * it arrived in, and leaves the rest of the document as it was — the code
 * samples in a post about Markdown included.
 */
export function gateImages(markdown: string): string {
  const blocks = offendingBlocks(parse(markdown));
  if (blocks.length === 0) return markdown;

  const gated = rewriteBlocks(markdown, blocks);

  // A rewritten block is built out of escaped text, code spans, links and
  // trusted images, so the parser should now resolve nothing left to fetch.
  // Asking it again is what makes that a fact rather than a claim. Were it ever
  // not, the document goes out as the characters it is made of, and no parser
  // reads an image out of text whose every bracket is escaped.
  return offendingBlocks(parse(gated)).length === 0 ? gated : escapeText(gated);
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
