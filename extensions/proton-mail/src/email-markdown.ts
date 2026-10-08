import TurndownService from "turndown";

export interface EmailMarkdownOptions {
  // Render remote images inline. Off by default: remote images can be used to track when an email is opened.
  images: boolean;
}

// Largest image we let Raycast render, in points
const MAX_IMAGE_WIDTH = 560;
const MAX_IMAGE_HEIGHT = 400;
// Images at or below this size are treated as icons (social links, spacers) and dropped
const ICON_SIZE = 48;
// Longer alt texts are image descriptions, not link names
const MAX_ALT_LABEL_LENGTH = 40;

// Zero-width and filler characters that newsletters pad their preheader with
const INVISIBLE_CHARS = new RegExp(
  [
    "\\u00AD",
    "\\u034F",
    "\\u061C",
    "\\u115F",
    "\\u1160",
    "\\u17B4",
    "\\u17B5",
    "\\u180E",
    "[\\u200B-\\u200F]",
    "[\\u2060-\\u2064]",
    "\\u3164",
    "\\uFEFF",
  ].join("|"),
  "g",
);
const NBSP = new RegExp("\\u00A0", "g");

type HtmlElement = TurndownService.Node & {
  getAttribute(name: string): string | null;
  querySelector(selector: string): HtmlElement | null;
};

function getStyle(node: HtmlElement): string {
  return (node.getAttribute("style") || "").toLowerCase().replace(/\s+/g, "");
}

function isHidden(node: HtmlElement): boolean {
  const style = getStyle(node);
  return (
    style.includes("display:none") ||
    style.includes("visibility:hidden") ||
    style.includes("mso-hide:all") ||
    (style.includes("max-height:0") && style.includes("overflow:hidden")) ||
    node.getAttribute("hidden") !== null ||
    node.getAttribute("aria-hidden") === "true"
  );
}

function readDimension(node: HtmlElement, name: "width" | "height"): number | undefined {
  const fromStyle = getStyle(node).match(new RegExp(`(?:^|;)${name}:(\\d+(?:\\.\\d+)?)px`));
  const raw = fromStyle?.[1] ?? node.getAttribute(name) ?? "";
  // Only pixel sizes: a percentage like width="100%" says nothing about the image itself
  if (!/^\s*\d+(?:\.\d+)?\s*(?:px)?\s*$/i.test(raw)) return undefined;
  const value = parseFloat(raw);
  return Number.isFinite(value) && value > 0 ? value : undefined;
}

function isRemoteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

// Markdown link destinations can't contain spaces or unbalanced parentheses
function escapeUrl(url: string): string {
  return url.trim().replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");
}

// "https://www.airbnb.fr/rooms/123?x=y" -> "airbnb.fr"
function shortUrlLabel(url: string): string {
  try {
    const { protocol, hostname, pathname } = new URL(url);
    if (protocol === "mailto:") return decodeURIComponent(pathname);
    return hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function looksLikeUrl(text: string): boolean {
  return /^(https?:\/\/|www\.)\S+$/i.test(text);
}

function imageMarkdown(node: HtmlElement, options: EmailMarkdownOptions): string {
  const src = node.getAttribute("src") || "";
  if (!options.images || !isRemoteUrl(src)) return "";

  const width = readDimension(node, "width");
  const height = readDimension(node, "height");
  // Tracking pixels and small icons
  if ((width !== undefined && width <= ICON_SIZE) || (height !== undefined && height <= ICON_SIZE)) return "";

  const alt = (node.getAttribute("alt") || "").replace(/[[\]]/g, "").trim();
  // Shrink to fit both limits, keeping the image's shape. Without any size, Raycast shows the image at its natural
  // size, scaled down to fit the pane.
  const fit = (limit: number, value: number | undefined) => (value === undefined ? 1 : limit / value);
  const scale = Math.min(1, fit(MAX_IMAGE_WIDTH, width), fit(MAX_IMAGE_HEIGHT, height));
  const size = [
    width !== undefined ? `raycast-width=${Math.round(width * scale)}` : "",
    height !== undefined ? `raycast-height=${Math.round(height * scale)}` : "",
  ].filter(Boolean);
  const sizedSrc = escapeUrl(src);
  const separator = sizedSrc.includes("?") ? "&" : "?";
  return `![${alt}](${size.length ? `${sizedSrc}${separator}${size.join("&")}` : sizedSrc})`;
}

function createTurndown(options: EmailMarkdownOptions): TurndownService {
  const turndown = new TurndownService({
    headingStyle: "atx",
    bulletListMarker: "-",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
    hr: "---",
  });

  turndown.remove(["style", "script", "head", "title", "meta", "link", "noscript", "iframe", "object", "form"]);

  // Newsletters use headings for decoration; at full Markdown size they dwarf the text
  turndown.addRule("heading", {
    filter: ["h1", "h2", "h3", "h4", "h5", "h6"],
    replacement: (content, node) => {
      const text = content.replace(/\s+/g, " ").trim();
      if (!text) return "";
      const level = Math.min(6, Number(node.nodeName.charAt(1)) + 2);
      return `\n\n${"#".repeat(level)} ${text}\n\n`;
    },
  });

  turndown.addRule("image", {
    filter: "img",
    replacement: (_content, node) => imageMarkdown(node as HtmlElement, options),
  });

  turndown.addRule("link", {
    filter: (node) => node.nodeName === "A" && !!(node as HtmlElement).getAttribute("href"),
    replacement: (content, node) => {
      const element = node as HtmlElement;
      const href = (element.getAttribute("href") || "").trim();
      if (!/^(https?:|mailto:)/i.test(href)) return content;

      // A linked image stays an image, wrapped in its link
      if (/^!\[[^\]]*\]\([^)]*\)$/.test(content.trim())) return `[${content.trim()}](${escapeUrl(href)})`;

      let label = content.replace(/\s+/g, " ").trim();
      if (!label) {
        // Image-only link (logo, button, social icon) shown without images: fall back to the alt text.
        // Short alts name the target; long ones describe the picture, so keep the link under its site name.
        const alt = (element.querySelector("img")?.getAttribute("alt") || "").replace(/\s+/g, " ").trim();
        // A linked logo just points to the sender's site: without the image it's noise
        if (/\blogo\b/i.test(alt)) return "";
        if (alt.length > MAX_ALT_LABEL_LENGTH) label = shortUrlLabel(href);
        else label = alt;
      }
      if (!label) return "";
      if (looksLikeUrl(label)) label = shortUrlLabel(href);

      return `[${label}](${escapeUrl(href)})`;
    },
  });

  // Added last because Turndown tries the most recently added rule first: a hidden link, image or heading
  // must be dropped rather than converted by the rules above
  turndown.addRule("hidden", {
    filter: (node) => isHidden(node as HtmlElement),
    replacement: () => "",
  });

  return turndown;
}

// Product cards often link both the image and the title, so without images the alt text repeats the title
function dropRepeatedBlocks(markdown: string): string {
  // Compare links by page, ignoring tracking parameters, so two links to different pages are both kept
  const linkTarget = (url: string) => {
    try {
      const { origin, pathname } = new URL(url);
      return origin + pathname;
    } catch {
      return url;
    }
  };
  const normalize = (block: string) =>
    block.replace(/\]\(([^)]*)\)/g, (_match, url: string) => `](${linkTarget(url)})`).trim();
  // Only blocks made of a single link (the image link and title link of a card), so a paragraph
  // the sender repeats on purpose is kept
  const isLinkOnly = (block: string) => /^\[[^\n]*\]\([^)\s]*\)$/.test(block.trim());
  return markdown
    .split("\n\n")
    .filter((block, index, blocks) => {
      const previous = blocks[index - 1];
      if (index === 0 || !isLinkOnly(block) || !isLinkOnly(previous)) return true;
      return normalize(block) !== normalize(previous);
    })
    .join("\n\n");
}

// Short links that follow each other (social networks, a listing's details, a footer menu) each end up in their
// own block, which stacks them down the page: put them on one line
const MAX_JOINED_LINK_LABEL_LENGTH = 40;

function joinShortLinks(markdown: string): string {
  const isShortLink = (block: string) => {
    const match = block.trim().match(/^\[([^\]\n]*)\]\([^)\s]*\)$/);
    return !!match && match[1].length <= MAX_JOINED_LINK_LABEL_LENGTH;
  };
  const blocks: string[] = [];
  for (const block of markdown.split("\n\n")) {
    const previous = blocks[blocks.length - 1];
    // The previous block is a short link, or short links already joined
    if (previous !== undefined && isShortLink(block) && previous.trim().split(" · ").every(isShortLink)) {
      blocks[blocks.length - 1] = `${previous.trim()} · ${block.trim()}`;
    } else {
      blocks.push(block);
    }
  }
  return blocks.join("\n\n");
}

// For text written around the email body (subject, names), so it isn't read as Markdown
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_[\]#<>|])/g, "\\$1");
}

function tidyMarkdown(markdown: string): string {
  return joinShortLinks(
    dropRepeatedBlocks(
      markdown
        .replace(INVISIBLE_CHARS, "")
        .replace(NBSP, " ")
        // Whitespace-only lines left behind by layout tables
        .replace(/^[ \t]+$/gm, "")
        .replace(/[ \t]+$/gm, (spaces) => (spaces.length >= 2 ? "  " : ""))
        // Separators stacked by nested layout tables
        .replace(/(\n\s*---\s*){2,}/g, "\n\n---\n\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
    ),
  );
}

// One converter per images setting, reused from one email to the next
const converters = new Map<boolean, TurndownService>();

function htmlToMarkdown(html: string, options: EmailMarkdownOptions): string {
  let converter = converters.get(options.images);
  if (!converter) {
    converter = createTurndown(options);
    converters.set(options.images, converter);
  }
  return tidyMarkdown(converter.turndown(html));
}

const URL_IN_TEXT = /<?\b(https?:\/\/[^\s<>"]*[^\s<>".,;:!?'")\]])>?/gi;

function textToMarkdown(text: string): string {
  const lines = text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) =>
      line
        // Keep plain text from turning into headings
        .replace(/^(\s*)#/, "$1\\#")
        .replace(URL_IN_TEXT, (_match, url: string) => `[${shortUrlLabel(url)}](${escapeUrl(url)})`),
    );

  // Plain text relies on single line breaks (signatures, addresses), so make them hard breaks
  return tidyMarkdown(lines.join("  \n").replace(/ {2}\n {2}\n/g, "\n\n"));
}

export function emailBodyToMarkdown(body: { text?: string; html?: string }, options: EmailMarkdownOptions): string {
  if (body.html) {
    const markdown = htmlToMarkdown(body.html, options);
    if (markdown) return markdown;
  }
  return body.text ? textToMarkdown(body.text) : "";
}
