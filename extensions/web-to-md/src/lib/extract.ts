import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import TurndownService from "turndown";
import { gfm } from "turndown-plugin-gfm";
import { fetchText } from "./fetch";
import { absolutizeAndSanitizeUrls } from "./html";

export type ExtractedArticle = {
  title?: string;
  author?: string;
  excerpt?: string;
  sourceUrl: string;
  bodyMarkdown: string;
};

export async function extractArticleMarkdown(url: string): Promise<ExtractedArticle | null> {
  const html = await fetchText(url);
  return extractArticleMarkdownFromHtml(html, url);
}

export function extractArticleMarkdownFromHtml(html: string, url: string): ExtractedArticle | null {
  const { document } = parseHTML(html);

  // linkedom leaves baseURI null, which silently disables Readability's own
  // relative-URI fixing. That matters because Readability promotes lazy-loaded
  // images (data-src -> src) *after* the pass below, so without a base those
  // land in the output as broken relative paths, and srcset is never absolutized
  // at all. Setting it first lets Readability resolve both.
  setDocumentBase(document as unknown as Document, url);

  absolutizeAndSanitizeUrls(document as unknown as Document, url);

  // keepClasses so `class="language-ts"` survives to the Turndown pass, which
  // is where the code fence language hint comes from. Turndown drops classes
  // from the output either way, so this only affects what we can detect.
  const reader = new Readability(document as unknown as Document, {
    keepClasses: true,
  });
  const article = reader.parse();
  if (!article?.content) return null;

  const turndown = createTurndown();
  const bodyMarkdown = turndown.turndown(article.content);

  return {
    title: article.title || undefined,
    author: article.byline || undefined,
    excerpt: article.excerpt || undefined,
    sourceUrl: url,
    bodyMarkdown,
  };
}

function setDocumentBase(document: Document, url: string) {
  for (const property of ["baseURI", "documentURI"] as const) {
    try {
      Object.defineProperty(document, property, {
        value: url,
        configurable: true,
      });
    } catch {
      // A future linkedom may define these as non-configurable; the explicit
      // absolutize pass still covers plain href/src attributes.
    }
  }
}

export async function extractFallbackMarkdown(url: string, prefix: string): Promise<ExtractedArticle | null> {
  const text = await fetchText(buildFallbackUrl(prefix, url));

  // Treat response as markdown-ish plain text (depends on the service).
  const bodyMarkdown = text.trim();
  if (!bodyMarkdown) return null;

  return {
    sourceUrl: url,
    bodyMarkdown,
  };
}

/**
 * Joins a reader-service prefix to a target URL without doubling the scheme.
 * `url` always arrives normalized, so it carries its own scheme; a prefix
 * ending in one — the shape reader services publish, and that users copy
 * verbatim — would otherwise yield ".../https://https://example.com".
 *
 * The redundant scheme is dropped from the prefix, never from the URL: the two
 * need not agree, and rewriting an http:// page to https:// would fetch a
 * different resource than the caller asked for.
 */
export function buildFallbackUrl(prefix: string, url: string): string {
  return `${prefix.replace(/https?:\/\/$/i, "")}${url}`;
}

function createTurndown(): TurndownService {
  const service = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    emDelimiter: "_",
  });

  service.use(gfm);

  // Keep <pre> blocks as fenced blocks even when nested markup exists. Filter on
  // PRE alone: a firstChild === CODE check misses the very common pretty-printed
  // "<pre>\n  <code>" shape, and Turndown's own fenced rule uses the same check,
  // so such blocks would fall through to an inline span with newlines collapsed.
  service.addRule("fencedCodeBlocks", {
    filter: (node: HTMLElement) => node.nodeName === "PRE",
    replacement: (_content: string, node: HTMLElement) => {
      const code = codeTextOf(node).replace(/^\n+/, "").replace(/\s+$/, "");
      const fence = fenceFor(code);
      return `\n\n${fence}${languageOf(node)}\n${code}\n${fence}\n\n`;
    },
  });

  return service;
}

/**
 * The code text of a <pre>. When its only real child is a single <code>, use
 * that (so formatting whitespace around the tag is not indented into the
 * output); otherwise take the whole subtree so sibling content isn't dropped.
 */
function codeTextOf(pre: HTMLElement): string {
  const meaningful = Array.from(pre.childNodes).filter((n) => n.nodeType !== 3 || (n.textContent ?? "").trim() !== "");

  if (meaningful.length === 1 && meaningful[0].nodeName === "CODE") {
    return meaningful[0].textContent ?? "";
  }
  return pre.textContent ?? "";
}

function languageOf(pre: HTMLElement): string {
  const candidates: Element[] = [pre, ...Array.from(pre.querySelectorAll("code"))];

  for (const el of candidates) {
    const hint = el.getAttribute("class") ?? el.getAttribute("data-language") ?? el.getAttribute("data-lang") ?? "";
    const match = hint.match(/(?:language|lang)-([a-z0-9+#.-]+)/i);
    if (match) return match[1].toLowerCase();
  }
  return "";
}

/** A fence must be longer than the longest backtick run inside the content. */
function fenceFor(code: string): string {
  const longest = (code.match(/`+/g) ?? []).reduce((max, run) => Math.max(max, run.length), 0);
  return "`".repeat(Math.max(3, longest + 1));
}
