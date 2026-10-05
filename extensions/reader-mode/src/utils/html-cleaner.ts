import { parseHTML } from "linkedom";
import { parseLog } from "./logger";
import { getSiteConfig } from "../config/site-config";
import { BARRIER_SELECTORS, caseInsensitive } from "./paywall-detector";

type LinkedomDocument = ReturnType<typeof parseHTML>["document"];

/**
 * Content gates / paywall barriers, stripped before extraction.
 *
 * These are the DETECTOR's own barrier selectors (`paywall-detector.ts`), reused rather than
 * re-listed — a hand-maintained copy drifted twice (Greptile flagged `content-gate`… then
 * `meter-`/`pw-overlay`/`barrier`… missing), because the two lists must agree but nothing forced
 * it. Now they can't drift: the cleaner strips exactly what the detector recognizes.
 *
 * Why strip them at all: if a gate's text ("Subscribe to read the rest…") is left in the article
 * body it lands in the extraction and trips the candidate validator's gating-phrase check,
 * rejecting an otherwise-complete article. Gate UI is never article content. Detection is
 * unaffected — it runs against the RAW fetch html, not this cleaned DOM.
 *
 * Two guards applied uniformly:
 *   - `caseInsensitive(...)` (the detector's own helper), so a capitalized `Content-Gate` is caught;
 *   - `:not(p)`, so a site that (like Condé Nast's `paywall`) puts body paragraphs on a barrier
 *     class isn't gutted — a real overlay is a container, not a bare paragraph.
 *
 * `CLEANER_KEEP` carves out `.subscriber-only`: sites put it on gated article content, and they
 * SEGMENT it (a class per subscriber paragraph). `:not(p)` and the per-element 30%-text guard do
 * NOT protect segmented content — four sibling `<div class="subscriber-only">` blocks at 25% each
 * are all below the guard and would be deleted, gutting the article. So the cleaner never DELETES
 * it; detection still SCORES it from the raw html (it stays in BARRIER_SELECTORS).
 *
 * Every OTHER barrier — including `[class*="premium"][class*="wrapper"]` — is stripped. A "wrapper"
 * is a single container, so a genuine premium-content wrapper is one large block the 30% guard
 * protects; stripping it removes the gate-text leak that would otherwise reject a full article.
 * (The residual — deeply segmented premium-wrapper *content* below the guard — is noted in
 * docs/known-issues.md; it is far less likely than the segmented subscriber-only case.)
 */
const CLEANER_KEEP = new Set([".subscriber-only"]);
const BARRIER_REMOVE_SELECTORS = BARRIER_SELECTORS.filter((s) => !CLEANER_KEEP.has(s)).map(
  (s) => `${caseInsensitive(s)}:not(p)`,
);

/**
 * Selectors for elements that should be removed before Readability processing.
 * Based on patterns from Safari Reader Mode and Reader View.
 */
const NEGATIVE_SELECTORS = [
  // Sidebars
  '[class*="sidebar"]',
  '[id*="sidebar"]',
  '[class*="side-bar"]',
  '[id*="side-bar"]',
  "aside",
  ".aside",

  // Comments
  '[class*="comment"]',
  '[id*="comment"]',
  "#disqus_thread",
  ".disqus",

  // Subscription/Newsletter boxes. Exclude only `subscriber-only` — the substring match catches
  // it, but sites put that class on gated *article content*, not a subscribe box, and stripping
  // it deleted the article (the per-element 30% guard can't save segmented subscriber-only
  // blocks). Scoped to `subscriber-only`, not all `subscriber`, so real subscriber UI
  // (`subscriber-offer`, `subscriber-cta`) is still removed. "subscribe" still matches everything.
  '[class*="subscribe"]:not([class*="subscriber-only"])',
  '[id*="subscribe"]:not([id*="subscriber-only"])',
  '[class*="newsletter"]',
  '[id*="newsletter"]',
  '[class*="signup"]',
  '[id*="signup"]',
  '[class*="sign-up"]',
  '[id*="sign-up"]',
  '[aria-label*="newsletter"]',
  '[aria-label*="subscribe"]',
  '[class*="email-signup"]',

  // Advertisements (enhanced from Defuddle)
  '[class*="advertisement"]',
  '[id*="advertisement"]',
  '[class*="ad-container"]',
  '[class*="ad-wrapper"]',
  '[class*="ad-slot"]',
  '[class*="advert"]',
  '[id*="advert"]',
  '[class*="sponsored"]',
  '[id*="sponsored"]',
  "[data-ad]",
  "[data-advertisement]",
  '.ad:not([class*="gradient"])',
  '[class^="ad-"]',
  '[class$="-ad"]',
  '[id^="ad-"]',
  '[id$="-ad"]',
  '[role="banner"]',
  '[alt*="advert"]',
  "#barrier-page",

  // Social/Sharing widgets
  '[class*="social"]',
  '[id*="social"]',
  '[class*="share"]',
  '[id*="share"]',
  '[class*="sharing"]',
  '[id*="sharing"]',
  ".sharedaddy",

  // Related content
  '[class*="related"]',
  '[id*="related"]',
  '[class*="recommended"]',
  '[id*="recommended"]',
  '[class*="promo"]',
  '[id*="promo"]',
  '[class*="more-stories"]',
  '[class*="more-articles"]',
  '[class*="read-more"]',
  '[class*="readmore"]',
  '[class*="read-next"]',
  '[class*="keep-reading"]',

  // Navigation
  "nav",
  '[role="navigation"]',
  '[class*="breadcrumb"]',
  '[id*="breadcrumb"]',
  "header",
  ".header:not(.banner)",
  "#header",
  '[class*="navigation"]',
  '[id*="navigation"]',
  ".menu",
  "#menu",
  '[class*="masthead"]',

  // Complementary content
  '[role="complementary"]',
  '[role="dialog"]',

  // Footer elements
  "footer",
  '[class*="footer"]',
  '[id*="footer"]',

  // Widgets and toolbars
  '[class*="widget"]',
  '[id*="widget"]',
  '[class*="toolbar"]',
  '[id*="toolbar"]',
  '[class*="toolbox"]',

  // Carousels and sliders
  '[class*="carousel"]',
  '[id*="carousel"]',
  '[class*="swiper"]',
  '[class*="slider"]',
  '[id*="slider"]',

  // Tags and meta (enhanced from Defuddle)
  '[class*="tags"]',
  '[class*="meta"]',
  '[class*="talkback"]',
  '[class*="byline"]',
  '[class*="dateline"]',
  '[class*="timestamp"]',
  '[class*="author-bio"]',
  '[class*="author-box"]',
  ".toc",
  "#toc",
  '[class*="table-of-contents"]',

  // Popups and modals
  '[class*="popup"]',
  '[class*="modal"]',
  '[class*="overlay"]',
  '[class*="lightbox"]',

  // Cookie banners and consent (enhanced from Defuddle)
  '[class*="cookie"]',
  '[id*="cookie"]',
  '[class*="consent"]',
  '[id*="consent"]',
  '[class*="gdpr"]',
  '[id*="gdpr"]',
  '[class*="privacy-banner"]',
  '[id*="privacy-banner"]',
  '[class*="privacy-notice"]',
  '[class*="privacy-settings"]',

  // Skip links and print-only elements
  '[class*="skip-link"]',
  '[class*="print-only"]',
  ".sr-only",
  ".screen-reader-text",
  ".visually-hidden",
  '[class*="noprint"]',
  '[data-print-layout="hide"]',

  // Hidden elements
  '[aria-hidden="true"]:not([class*="math"])',
  '[style*="display: none"]:not([class*="math"])',
  '[style*="display:none"]:not([class*="math"])',
  "[hidden]",
  ".hidden",
  ".invisible",

  // Forms and inputs (from Defuddle)
  "form",
  "fieldset",
  'input:not([type="checkbox"])',
  "textarea",
  "select",
  "button",

  // Call-to-action elements (from Defuddle)
  '[class*="cta"]',
  '[class*="donate"]',
  '[class*="donation"]',
  // `[class*="paywall"]` and the other barriers are stripped via BARRIER_REMOVE_SELECTORS (the
  // detector's shared list, applied `:not(p)` so Condé Nast body paragraphs on `class="paywall"`
  // survive). See the block near the top of this file.
  '[class*="upsell"]',
  '[class*="feedback"]',

  // Pagination
  '[class*="pagination"]',
  '[class*="pager"]',

  // Author/profile sections (often redundant)
  '[class*="profile"]',
  '[class*="avatar"]',
  '[class*="bio-block"]',

  // Trending/popular sections
  '[class*="trending"]',
  '[class*="popular"]',
  '[class*="most-read"]',

  // Platform-specific (from Defuddle)
  ".pencraft:not(.pc-display-contents)", // Substack
  "#NYT_ABOVE_MAIN_CONTENT_REGION", // NYTimes
  "table.infobox", // Wikipedia
];

/**
 * Selectors that indicate the element should be preserved even if it matches negative patterns.
 * These are typically the main article content containers.
 */
const PROTECTED_SELECTORS = [
  "article",
  '[role="main"]',
  "main",
  '[itemprop="articleBody"]',
  '[itemtype*="schema.org/Article"]',
  '[itemtype*="schema.org/NewsArticle"]',
  ".post-content",
  ".article-content",
  ".entry-content",
  ".content-body",
  ".story-body",
];

/**
 * Lazy-load image attributes to check, in priority order.
 * Based on Safari Reader's lazyLoadingImageURLForElement function.
 */
const LAZY_LOAD_ATTRIBUTES = [
  "data-src",
  "data-lazy-src",
  "data-original",
  "datasrc",
  "original-src",
  "data-srcset",
  "data-lazy-srcset",
  "data-hi-res-src",
  "data-native-src",
];

/**
 * Link density threshold for identifying navigation-heavy elements.
 * Elements with link density > threshold are likely navigation, not content.
 * Mozilla Readability uses ~0.25-0.33.
 */
const LINK_DENSITY_THRESHOLD = 0.25;

/**
 * Minimum text length for link density analysis.
 * Very short elements aren't worth analyzing.
 */
const MIN_TEXT_LENGTH_FOR_DENSITY = 50;

/**
 * Share of the page's text an element may hold and still be removable as chrome.
 *
 * Navigation, sidebars, and footers are a modest fraction of a page's words. An element
 * holding more than this is the article — even if its class name happens to contain
 * "meta" or "share" and so matches one of the substring selectors above.
 */
const MAX_REMOVABLE_TEXT_RATIO = 0.3;

/**
 * Calculates the link density of an element.
 * Link density = (text length in links) / (total text length)
 * Excludes hash-only anchors (internal page links).
 */
function getLinkDensity(element: Element): number {
  const textLength = (element.textContent || "").length;
  if (textLength === 0) return 0;

  let linkLength = 0;
  element.querySelectorAll("a").forEach((link) => {
    const href = link.getAttribute("href") || "";
    // Don't count hash-only links (internal anchors)
    if (href.startsWith("#")) return;
    linkLength += (link.textContent || "").length;
  });

  return linkLength / textLength;
}

export interface CleaningResult {
  removedCount: number;
  lazyImagesResolved: number;
  linkDenseRemoved: number;
  schemaArticleFound: boolean;
  siteConfigApplied: string | null;
}

/**
 * Pre-cleans a document before Readability processing, in place.
 * Removes sidebars, ads, comments, subscription boxes, and other non-article content.
 *
 * Mutates the document it is given rather than parsing and re-serializing HTML —
 * the round-trip cost a second DOM plus a full copy of the markup as a string.
 */
export function preCleanHtml(document: LinkedomDocument, url: string): CleaningResult {
  let removedCount = 0;
  let lazyImagesResolved = 0;
  let linkDenseRemoved = 0;
  let schemaArticleFound = false;
  let siteConfigApplied: string | null = null;

  // Check for Schema.org article containers
  const schemaArticle = document.querySelector(
    '[itemprop="articleBody"], [itemtype*="schema.org/Article"], [itemtype*="schema.org/NewsArticle"]',
  );
  if (schemaArticle) {
    schemaArticleFound = true;
    parseLog.log("clean:schema-detected", { url });
  }

  // Apply site-specific configuration
  try {
    const hostname = new URL(url).hostname;
    const config = getSiteConfig(hostname);
    if (config) {
      siteConfigApplied = config.name;
      parseLog.log("clean:site-config-applied", { url, siteName: config.name });

      // Remove elements specified by site config
      if (config.removeSelectors) {
        config.removeSelectors.forEach((selector: string) => {
          document.querySelectorAll(selector).forEach((el) => {
            el.remove();
            removedCount++;
          });
        });
      }

      // Remove elements by text content patterns
      if (config.removeTextPatterns) {
        config.removeTextPatterns.forEach(({ selector, pattern }) => {
          const regex = new RegExp(pattern, "i");
          document.querySelectorAll(selector).forEach((el) => {
            const text = el.textContent?.trim() || "";
            if (regex.test(text)) {
              el.remove();
              removedCount++;
            }
          });
        });
      }

      // Convert block elements to inline (div -> span) for better markdown rendering
      if (config.inlineSelectors) {
        config.inlineSelectors.forEach((selector) => {
          document.querySelectorAll(selector).forEach((el) => {
            const span = document.createElement("span");
            span.innerHTML = el.innerHTML;
            // Copy over any class attributes
            const className = el.getAttribute("class");
            if (className) span.setAttribute("class", className);
            el.replaceWith(span);
          });
        });
      }

      // Format captions: wrap text in <em> and add space before credits
      if (config.captionConfig) {
        const { textSelector, creditSelector } = config.captionConfig;

        document.querySelectorAll(textSelector).forEach((captionText) => {
          // Ensure caption text ends with a period
          const text = captionText.textContent?.trim() || "";
          if (text && !text.endsWith(".") && !text.endsWith("!") && !text.endsWith("?")) {
            captionText.textContent = text + ".";
          }

          // Wrap caption text in <em> for italic formatting
          const em = document.createElement("em");
          em.innerHTML = captionText.innerHTML;
          captionText.innerHTML = "";
          captionText.appendChild(em);
        });

        document.querySelectorAll(creditSelector).forEach((credit) => {
          // Add a space before the credit text
          const textContent = credit.textContent?.trim();
          if (textContent) {
            credit.textContent = " " + textContent;
          }
        });
      }
    }
  } catch {
    // Invalid URL, skip site config
  }

  // Collect the article containers (built-in + site config articleSelector).
  const allProtectedSelectors = [...PROTECTED_SELECTORS];
  try {
    const hostname = new URL(url).hostname;
    const config = getSiteConfig(hostname);
    if (config?.articleSelector) {
      allProtectedSelectors.push(config.articleSelector);
      parseLog.log("clean:protecting-article-selector", { url, selector: config.articleSelector });
    }
  } catch {
    // Invalid URL, skip
  }

  // Protect the article containers themselves and their ancestors, so cleaning can
  // never delete the element that holds the article (or unmount it via a parent).
  //
  // Deliberately NOT their descendants: ads, share widgets, and newsletter boxes live
  // *inside* <main>/<article> on most sites. Protecting every descendant marked ~97% of
  // a Wikipedia page unremovable and quietly turned the whole cleaning pass into a no-op.
  const protectedElements = new Set<Element>();

  allProtectedSelectors.forEach((selector) => {
    try {
      document.querySelectorAll(selector).forEach((el) => {
        protectedElements.add(el);

        let parent = el.parentElement;
        while (parent) {
          protectedElements.add(parent);
          parent = parent.parentElement;
        }
      });
    } catch {
      // Selector might fail in linkedom, skip
    }
  });

  // The negative selectors match on substrings, so a genuine article wrapper named
  // "article-metadata-body" or "shared-story-body" matches [class*="meta"] / [class*="share"]
  // and would be deleted along with the whole article. Chrome is small and articles are not,
  // so an element holding a large share of the page's text is treated as content whatever
  // its class name suggests.
  const documentTextLength = (document.body?.textContent ?? "").trim().length;
  const contentThreshold = documentTextLength * MAX_REMOVABLE_TEXT_RATIO;

  /** Would removing this element take a substantial part of the page's text with it? */
  const holdsSubstantialText = (el: Element): boolean =>
    documentTextLength > 0 && (el.textContent ?? "").trim().length > contentThreshold;

  /**
   * An element may be removed unless it is an article container, an ancestor of one,
   * or holds so much text that it is evidently the article itself.
   */
  const isProtected = (el: Element): boolean => protectedElements.has(el) || holdsSubstantialText(el);

  // Remove negative elements and content-gate barriers (unless protected). Barriers are the
  // detector's shared list (see BARRIER_REMOVE_SELECTORS) so the two can't drift apart.
  [...NEGATIVE_SELECTORS, ...BARRIER_REMOVE_SELECTORS].forEach((selector) => {
    try {
      document.querySelectorAll(selector).forEach((el) => {
        if (isProtected(el)) return;

        el.remove();
        removedCount++;
      });
    } catch {
      // Some selectors might fail in linkedom, skip them
    }
  });

  // Remove link-dense elements (likely navigation, not content)
  // Target div/section/aside elements that are mostly links
  document.querySelectorAll("div, section, aside, ul").forEach((el) => {
    if (isProtected(el)) return;

    const textLength = (el.textContent || "").length;
    if (textLength < MIN_TEXT_LENGTH_FOR_DENSITY) return;

    const linkDensity = getLinkDensity(el);

    // Remove elements that are severely link-dense (>50% links)
    // These are almost certainly navigation, not content
    if (linkDensity > 0.5) {
      el.remove();
      linkDenseRemoved++;
      return;
    }

    // For elements above threshold but not severe, only remove if they
    // look like navigation (lists with many links, menus, etc.)
    if (linkDensity > LINK_DENSITY_THRESHOLD) {
      const tagName = el.tagName?.toLowerCase();
      const className = (el.className || "").toLowerCase();
      const id = (el.id || "").toLowerCase();

      // Check for navigation-like patterns
      const isLikelyNav =
        tagName === "ul" ||
        tagName === "aside" ||
        className.includes("menu") ||
        className.includes("nav") ||
        className.includes("links") ||
        id.includes("menu") ||
        id.includes("nav") ||
        id.includes("links");

      if (isLikelyNav) {
        el.remove();
        linkDenseRemoved++;
      }
    }
  });

  // Resolve lazy-loaded images
  document.querySelectorAll("img").forEach((img) => {
    const currentSrc = img.getAttribute("src");
    const isPlaceholder =
      !currentSrc ||
      currentSrc.startsWith("data:") ||
      currentSrc.includes("placeholder") ||
      currentSrc.includes("transparent") ||
      currentSrc.includes("blank");

    if (isPlaceholder) {
      for (const attr of LAZY_LOAD_ATTRIBUTES) {
        const lazySrc = img.getAttribute(attr);
        if (lazySrc && !lazySrc.startsWith("data:")) {
          if (attr.includes("srcset")) {
            img.setAttribute("srcset", lazySrc);
          } else {
            img.setAttribute("src", lazySrc);
          }
          lazyImagesResolved++;
          break;
        }
      }
    }
  });

  parseLog.log("clean:complete", {
    url,
    removedCount,
    lazyImagesResolved,
    linkDenseRemoved,
    schemaArticleFound,
    siteConfigApplied,
  });

  return {
    removedCount,
    lazyImagesResolved,
    linkDenseRemoved,
    schemaArticleFound,
    siteConfigApplied,
  };
}
