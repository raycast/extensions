import { isProbablyReaderable, Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { getSiteConfig } from "../config/site-config";
import { getExtractor } from "../extractors";
import { findPayloadArticles, PayloadArticle } from "./data-payload";
import { preCleanHtml } from "./html-cleaner";
import { parseLog } from "./logger";
import { MetadataExtractor } from "./metadata-extractor";

type LinkedomDocument = ReturnType<typeof parseHTML>["document"];

export interface ArticleContent {
  title: string;
  content: string;
  textContent: string;
  excerpt: string;
  byline: string | null;
  siteName: string | null;
  length: number;
  // Enhanced metadata from Schema.org, OG, Twitter Cards
  author: string | null;
  published: string | null;
  image: string | null;
  description: string | null;
  favicon: string | null;
  /**
   * The article came from the page's data payload, which held well over what the page shows.
   * The page's paywall markup then describes the teaser, not this text.
   */
  recoveredFromPayload?: boolean;
}

export interface ReadabilityError {
  type: "not-readable" | "parse-failed" | "empty-content";
  message: string;
}

export interface ReadabilityOptions {
  skipPreCheck?: boolean;
  forceParse?: boolean;
}

/**
 * Rewrites relative img/a URLs to absolute ones, in place.
 *
 * Done on the DOM rather than by regex over the HTML string: linkedom does not
 * fully resolve <base>, and the regex approach required an entire second copy of
 * the document as a string just to hold the result.
 */
function makeUrlsAbsolute(document: LinkedomDocument, baseUrl: string): void {
  const rewrite = (selector: string, attr: string) => {
    document.querySelectorAll(selector).forEach((el) => {
      const value = el.getAttribute(attr);
      if (!value) return;

      try {
        el.setAttribute(attr, new URL(value, baseUrl).href);
      } catch {
        // Leave unparseable URLs as they are
      }
    });
  };

  rewrite("img[src]", "src");
  rewrite("a[href]", "href");
}

/** Generic article containers, tried in order when the site has no configured selector. */
const FALLBACK_SELECTORS = [
  ".post-content",
  ".entry-content",
  ".article-content",
  ".content",
  "article",
  "main",
  '[role="main"]',
];

/**
 * The page's data payload replaces Readability's result when it holds this many times the text:
 * the visible page is then a teaser, not the article.
 */
const PAYLOAD_PREFERENCE_RATIO = 1.5;

/**
 * How much of Readability's article a payload article must contain to replace it. A
 * continuation of a teaser contains the teaser: all of it on The Atlantic's real capture. A
 * comment quoting the article's opening contains one paragraph of it, which on a short article
 * is a third.
 */
const MIN_CONTINUATION_SHARE = 0.5;

/** Elements whose subtree is never text the page shows. */
const UNSHOWN_ELEMENTS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE", "IFRAME"]);

/**
 * The text the page shows, in one walk over its text nodes, skipping hidden subtrees and the
 * contents of scripts (which hold the payload itself). Not aria-hidden: a modal, the subscribe
 * wall itself, marks the whole page behind it so.
 */
function shownText(document: LinkedomDocument): string {
  const parts: string[] = [];
  const stack: Node[] = document.body ? [document.body as unknown as Node] : [];
  while (stack.length) {
    const node = stack.pop()!;
    if (node.nodeType === 3) {
      parts.push(node.nodeValue ?? "");
      continue;
    }
    if (node.nodeType !== 1) continue;
    const el = node as Element;
    if (UNSHOWN_ELEMENTS.has(el.tagName.toUpperCase()) || el.hasAttribute("hidden")) continue;
    for (let i = el.childNodes.length - 1; i >= 0; i--) stack.push(el.childNodes[i]);
  }
  return parts.join("");
}

/** Minimum text for a generic container to be believable as the article. */
const MIN_FALLBACK_TEXT_LENGTH = 200;

interface FallbackContent {
  selector: string;
  content: string;
  textContent: string;
}

/**
 * Grabs the best direct-extraction candidate, for use if Readability comes back empty.
 *
 * Must be called BEFORE `Readability.parse()`, which strips the document it is given —
 * afterward these selectors match nothing and the fallback can never fire.
 */
function captureFallbackContent(document: LinkedomDocument, url: string): FallbackContent | null {
  // A site-configured selector is the best guess for that site, but it must still hold
  // real text: the container often renders empty on a paywalled or JS-populated page, and
  // returning that as a "successful" parse would suppress the browser-tab and Paywall
  // Hopper recovery paths that could still get the actual article.
  try {
    const config = getSiteConfig(new URL(url).hostname);

    if (config?.articleSelector) {
      const el = document.querySelector(config.articleSelector);
      const textContent = el?.textContent ?? "";

      if (textContent.trim().length > MIN_FALLBACK_TEXT_LENGTH) {
        return { selector: config.articleSelector, content: el?.innerHTML ?? "", textContent };
      }
    }
  } catch {
    // Invalid URL — fall through to the generic containers
  }

  for (const selector of FALLBACK_SELECTORS) {
    const el = document.querySelector(selector);
    if (!el) continue;

    const textContent = el.textContent ?? "";
    if (textContent.trim().length > MIN_FALLBACK_TEXT_LENGTH) {
      return { selector, content: el.innerHTML ?? "", textContent };
    }
  }

  return null;
}

/**
 * Parses HTML content using Mozilla Readability to extract article content
 */
export function parseArticle(
  html: string,
  url: string,
  options: ReadabilityOptions = {},
): { success: true; article: ArticleContent } | { success: false; error: ReadabilityError } {
  parseLog.log("parse:start", { url, htmlLength: html.length });

  try {
    // One DOM for the whole pipeline.
    //
    // This previously built three: one inside preCleanHtml, one by re-parsing its
    // serialized output, and one by re-parsing the original HTML for metadata — all
    // alive at once, alongside two full copies of the HTML string. A 1.9MB page cost
    // ~104MB of heap and tripped Raycast's 100MB limit; a single DOM costs ~33MB.
    //
    // The order below is what makes one DOM sufficient: absolutize and read metadata
    // first, then clean. Metadata lives in <head> (JSON-LD, meta tags, title, canonical),
    // which the cleaner never touches, so nothing is lost by sharing the document.
    const { document } = parseHTML(html);

    makeUrlsAbsolute(document, url);

    const metadata = MetadataExtractor.extract(document, url);

    // Site-specific extractors run against the uncleaned document, as they did before.
    const extractor = getExtractor(document, url, metadata.schemaOrgData);
    if (extractor) {
      parseLog.log("parse:extractor", { url, extractor: extractor.siteName });

      try {
        const result = extractor.extract();

        parseLog.log("parse:extractor:success", {
          url,
          extractor: extractor.siteName,
          contentLength: result.content.length,
          textLength: result.textContent.length,
        });

        return {
          success: true,
          article: {
            title: result.metadata.title || metadata.title || "Untitled",
            content: result.content,
            textContent: result.textContent,
            excerpt: result.metadata.description || metadata.description || "",
            byline: result.metadata.author || null,
            siteName: result.metadata.siteName || metadata.siteName || null,
            length: result.textContent.length,
            author: result.metadata.author || metadata.author || null,
            published: result.metadata.published || metadata.published || null,
            image: result.metadata.image || metadata.image || null,
            description: result.metadata.description || metadata.description || null,
            favicon: metadata.favicon || null,
          },
        };
      } catch (extractorErr) {
        // If extractor fails, fall back to Readability
        parseLog.warn("parse:extractor:error", {
          url,
          extractor: extractor.siteName,
          error: extractorErr instanceof Error ? extractorErr.message : "Unknown error",
        });
      }
    }

    // Some pages show a teaser but ship the whole article in their Nuxt or Next.js data payload. Read it,
    // and the article text the page shows, before cleaning, which can remove both.
    const dataPayload = findPayloadArticles(document, url);
    const pageText = dataPayload ? shownText(document) : "";
    const fromPayload = (payload: PayloadArticle, reason: string) => {
      const recoveredFromPayload = payload.textContent.length > payload.shownLength * PAYLOAD_PREFERENCE_RATIO;
      parseLog.log("parse:data-payload", {
        url,
        reason,
        textLength: payload.textContent.length,
        recoveredFromPayload,
        candidates: dataPayload?.candidates,
      });
      return {
        success: true as const,
        article: {
          title: metadata.title || "Untitled",
          content: payload.content,
          textContent: payload.textContent,
          excerpt: metadata.description || "",
          byline: metadata.author || null,
          siteName: metadata.siteName || null,
          length: payload.textContent.length,
          author: metadata.author || null,
          published: metadata.published || null,
          image: metadata.image || null,
          description: metadata.description || null,
          favicon: metadata.favicon || null,
          recoveredFromPayload,
        },
      };
    };
    // When Readability can't read the page, the payload article must still share a paragraph with it.
    const payloadForPage = () => dataPayload?.pick(pageText) ?? null;

    // Strip sidebars, ads, comments, subscription boxes, and other non-article chrome.
    // Mutates the document in place; only Readability sees the result, and site
    // extractors have already returned above without needing it.
    preCleanHtml(document, url);

    // Pre-check if content is likely readable
    if (!options.skipPreCheck) {
      const isReadable = isProbablyReaderable(document);
      parseLog.log("parse:precheck", { url, isReadable });

      if (!isReadable) {
        const payload = payloadForPage();
        if (payload) return fromPayload(payload, "not-readable");
        parseLog.warn("parse:skip", { url, reason: "content not readable" });
        return {
          success: false,
          error: {
            type: "not-readable",
            message:
              "This page doesn't appear to contain readable article content. It may be a homepage, search results, or a page with mostly navigation elements.",
          },
        };
      }
    }

    // Readability CONSUMES the document: after parse() the body is stripped bare and
    // every selector below would miss. Snapshot the fallback's candidate containers
    // first, while the DOM still has content in it.
    const fallbackContent = options.forceParse ? captureFallbackContent(document, url) : null;

    // Parse with Readability
    const reader = new Readability(document);
    const article = reader.parse();

    if (!article || !article.content || article.content.trim().length === 0) {
      const reason = !article ? "Readability returned null" : "empty content";
      parseLog.warn("parse:readability-failed", { url, reason });
      const payload = payloadForPage();
      if (payload) return fromPayload(payload, "readability-failed");

      // Fall back to whatever we snapshotted before Readability emptied the document.
      if (fallbackContent) {
        parseLog.log("parse:force-extract:success", {
          url,
          selector: fallbackContent.selector,
          contentLength: fallbackContent.content.length,
        });

        return {
          success: true,
          article: {
            title: metadata.title || "Untitled",
            content: fallbackContent.content,
            textContent: fallbackContent.textContent,
            excerpt: metadata.description || "",
            byline: null,
            siteName: metadata.siteName || null,
            length: fallbackContent.textContent.length,
            author: metadata.author || null,
            published: metadata.published || null,
            image: metadata.image || null,
            description: metadata.description || null,
            favicon: metadata.favicon || null,
          },
        };
      }

      parseLog.error("parse:error", { url, reason });
      return {
        success: false,
        error: {
          type: reason === "empty content" ? "empty-content" : "parse-failed",
          message: "Unable to extract content from this page",
        },
      };
    }

    const textContent = article.textContent || "";
    // The payload replaces Readability's article only when it continues it: it contains a real
    // share of what Readability found, and holds well over that much text.
    const payload = dataPayload?.pick(textContent) ?? null;
    const shown = textContent.trim().length;
    if (
      payload &&
      payload.shownLength >= shown * MIN_CONTINUATION_SHARE &&
      payload.textContent.length > shown * PAYLOAD_PREFERENCE_RATIO
    ) {
      return fromPayload(payload, "longer-than-page");
    }

    parseLog.log("parse:success", {
      url,
      title: article.title,
      contentLength: article.content.length,
      textLength: textContent.length,
      hasByline: !!article.byline,
      hasSiteName: !!article.siteName,
    });

    // Merge Readability output with extracted metadata
    // Metadata provides fallbacks and additional fields
    return {
      success: true,
      article: {
        title: article.title || metadata.title || "Untitled",
        content: article.content,
        textContent,
        excerpt: article.excerpt || metadata.description || "",
        byline: article.byline || null,
        siteName: article.siteName || metadata.siteName || null,
        length: article.length || textContent.length,
        // Enhanced metadata fields
        author: metadata.author || article.byline || null,
        published: metadata.published || null,
        image: metadata.image || null,
        description: metadata.description || article.excerpt || null,
        favicon: metadata.favicon || null,
      },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown parsing error";
    parseLog.error("parse:error", { url, error: message });
    return {
      success: false,
      error: {
        type: "parse-failed",
        message: `Failed to parse content: ${message}`,
      },
    };
  }
}
