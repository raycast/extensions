import { parse, HTMLElement, Node as HtmlNode, TextNode } from "node-html-parser";

export interface Anchor {
  href: string;
  text: string;
  index: number;
}

export interface SanitizedHtml {
  text: string;
  anchors: Anchor[];
}

const SKIPPED_TAGS = new Set(["head", "style", "script", "noscript", "template", "svg", "math", "object", "embed"]);

const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "canvas",
  "dd",
  "div",
  "dl",
  "dt",
  "fieldset",
  "figcaption",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "tfoot",
  "ul",
  "video",
]);

function removeControlCharacters(input: string): string {
  let result = "";
  for (const char of input) {
    const code = char.charCodeAt(0);
    if (code < 0x20 || code === 0x7f || (code >= 0x80 && code <= 0x9f)) {
      result += " ";
    } else {
      result += char;
    }
  }
  return result;
}

function isElement(node: HtmlNode): node is HTMLElement {
  return node.nodeType === 1;
}

function isTextNode(node: HtmlNode): node is TextNode {
  return node.nodeType === 3;
}

function isHidden(element: HTMLElement): boolean {
  const style = element.getAttribute("style") || "";
  const displayNone = /display\s*:\s*none/i.test(style);
  const visibilityHidden = /visibility\s*:\s*hidden/i.test(style);
  const ariaHidden = element.getAttribute("aria-hidden");
  return ariaHidden === "true" || displayNone || visibilityHidden;
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (match, entity) => {
      if (entity[0] === "#" && entity[1] === "x") {
        return String.fromCodePoint(parseInt(entity.slice(2), 16));
      } else if (entity[0] === "#") {
        return String.fromCodePoint(parseInt(entity.slice(1), 10));
      }
      const entities: Record<string, string> = {
        amp: "&",
        lt: "<",
        gt: ">",
        quot: '"',
        nbsp: " ",
        apos: "'",
      };
      return entities[entity] || match;
    })
    .normalize("NFKC");
}

function normalizeWhitespace(input: string): string {
  return removeControlCharacters(input).replace(/\s+/g, " ").trim();
}

function collectVisibleText(element: HTMLElement): string {
  const parts: string[] = [];

  function walk(node: HtmlNode): void {
    if (isElement(node)) {
      const tag = node.tagName?.toLowerCase();
      if (SKIPPED_TAGS.has(tag || "") || isHidden(node)) {
        return;
      }

      if (tag === "br") {
        parts.push(" ");
        return;
      }

      if (tag === "img") {
        const alt = node.getAttribute("alt");
        if (alt) parts.push(" ", alt, " ");
        return;
      }

      for (const child of node.childNodes) {
        walk(child);
      }

      if (BLOCK_TAGS.has(tag)) {
        parts.push("\n");
      }
    } else if (isTextNode(node)) {
      const text = node.text;
      if (text) parts.push(text);
    }
  }

  walk(element);
  return normalizeWhitespace(parts.join(""));
}

function extractAnchors(root: HTMLElement): Anchor[] {
  const anchors: Anchor[] = [];
  let index = 0;

  for (const anchor of root.querySelectorAll("a")) {
    const href = anchor.getAttribute("href") || "";
    const text = collectVisibleText(anchor);
    if (href) {
      anchors.push({
        href: decodeHtmlEntities(href).trim(),
        text: decodeHtmlEntities(text).trim(),
        index,
      });
      index++;
    }
  }

  return anchors;
}

export function sanitizeHtml(html: string): SanitizedHtml {
  if (!html || typeof html !== "string") {
    return { text: "", anchors: [] };
  }

  let root: HTMLElement;
  try {
    root = parse(html);
  } catch {
    return { text: "", anchors: [] };
  }

  const anchors = extractAnchors(root);
  const text = collectVisibleText(root);

  return { text, anchors };
}

export function getVisibleText(html: string): string {
  return sanitizeHtml(html).text;
}
