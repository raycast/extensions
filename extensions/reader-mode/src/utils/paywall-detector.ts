/**
 * Paywall Detection
 *
 * Decides whether a page that fetched successfully (200 OK) is actually showing us the
 * article, or a paywall — a subscription barrier, a metered "you've read your last free
 * article" wall, or a preview that stops mid-story.
 *
 * This used to run only against a hardcoded list of thirteen domains, which meant a
 * paywall on any other site was invisible: the subscription pitch, the app icons, and the
 * email-capture form were extracted and shown to the reader as if they were the article.
 * Detection is now evidence-based and runs everywhere.
 *
 * Evidence is weighed rather than trusted individually, because the circumstantial signals all
 * have plausible innocent explanations: a media-criticism piece quotes "subscribe now", a brief
 * post trails off in an ellipsis, an SEO plugin emits a description longer than the post. A
 * verdict therefore requires direct evidence of a barrier — see PAYWALL_SCORE_THRESHOLD.
 */

import { parseHTML } from "linkedom";
import { paywallLog } from "./logger";
import { PAYWALL_KEYWORDS, PAYWALL_SELECTORS, TRUNCATION_PATTERNS } from "../extractors/_paywall";

/** A single piece of evidence that a page is paywalled. */
export interface PaywallSignal {
  /** Which check fired, for logs and debugging. */
  name: string;
  /** How much this signal counts toward the verdict. */
  weight: number;
  /** What specifically matched. */
  detail: string;
}

export interface PaywallDetectionResult {
  isPaywalled: boolean;
  /** Evidence found, strongest first. */
  signals: PaywallSignal[];
  /** Summed weight of the evidence. */
  score: number;
  url: string;
  /** Kept for callers that log the first thing that matched. */
  matchedPattern?: string;
}

/**
 * Score at which a page is judged paywalled.
 *
 * A false positive is expensive: it sends a perfectly readable article through six network
 * bypass attempts, and can end up replacing good content with a worse archived copy.
 *
 * So the weights uphold one invariant: **a page is never condemned without direct evidence of
 * a barrier.** The conclusive signals — markup or language that exists for no reason other
 * than to gate content — carry 3 and clear the bar alone. Everything else is circumstantial,
 * carries 1, and there are never enough of them to convict on their own.
 */
const PAYWALL_SCORE_THRESHOLD = 3;

/** Conclusive: this exists only to gate content. Enough on its own. */
const CONCLUSIVE = 3;

/** Circumstantial: consistent with a paywall, but also with an ordinary page. */
const CIRCUMSTANTIAL = 1;

/** A page whose body is this much shorter than its own description is a preview, not an article. */
const TRUNCATION_RATIO = 1.5;

/**
 * Below this, an "article" is too short to be one.
 *
 * Weak evidence on its own — plenty of legitimate posts are short — and deliberately not
 * allowed to combine with `truncated-ending`, since a short post is exactly the kind that
 * ends in an ellipsis or a "continue reading" link without being gated at all.
 */
const SUSPICIOUSLY_SHORT_ARTICLE = 900;

/**
 * DOM structures that only exist to gate content. Their presence in the markup is
 * conclusive on its own: no publisher ships an element named `--paywall-inline-barrier`
 * around an article they intend you to read.
 */
const BARRIER_SELECTORS = [
  ...PAYWALL_SELECTORS,
  '[class*="barrier"]',
  '[class*="regwall"]',
  '[class*="registration-wall"]',
  '[class*="piano-"]',
  '[class*="tp-modal"]',
  '[class*="premium"][class*="wrapper"]',
  '[class*="article-gate"]',
  '[class*="content-gate"]',
  '[data-testid*="subscribe"]',
];

/** Phrases that a page shows only when it is withholding the story. */
const BARRIER_PHRASES: RegExp[] = [
  /subscribe to (?:unlock|read|continue)/i,
  /(?:this|the) (?:article|story|content) is (?:reserved )?for subscribers/i,
  /create (?:a )?(?:free )?account to continue/i,
  /(?:log ?in|sign ?in) to (?:read|continue)/i,
  /to continue reading[,.]? (?:subscribe|sign|log|create|register)/i,
  /you(?:'ve| have) (?:reached|read) your (?:free )?(?:article|story) limit/i,
  /already a (?:subscriber|member)\?/i,
  /unlimited (?:digital )?access/i,
  /for subscribers only/i,
];

interface PaywallEvidence {
  /** The article text we managed to extract. */
  textContent: string;
  /** The raw HTML, if available — DOM barriers are the strongest signal. */
  html?: string;
  /** The page's own summary of itself (og:description), if any. */
  description?: string | null;
}

/**
 * Weighs the evidence that `url` is paywalled.
 *
 * Runs on every site. There is no allowlist to fall off.
 */
export function detectPaywall(evidence: PaywallEvidence, url: string): PaywallDetectionResult {
  const { textContent, html, description } = evidence;
  const signals: PaywallSignal[] = [];

  const bodyLength = textContent.trim().length;
  const isShort = bodyLength < SUSPICIOUSLY_SHORT_ARTICLE;

  // Conclusive: markup that exists for no purpose other than gating the article.
  //
  // Only a *visible* barrier counts. Sites routinely ship inert paywall markup — a hidden
  // template or `<div hidden class="paywall">` revealed by JS only when a meter trips — on
  // every page, including fully readable ones. Convicting on that sends a good article through
  // the bypass waterfall, where a longer archived parse can replace it. Whether an element is
  // hidden depends on it and its ancestors, which a regex over the HTML string can't answer
  // reliably, so this parses the page and checks computed visibility.
  if (html) {
    const barrier = findVisibleBarrier(html);
    if (barrier) {
      signals.push({ name: "barrier-element", weight: CONCLUSIVE, detail: barrier });
    }
  }

  // Conclusive: the page says out loud that it is withholding the story.
  const barrierPhrase = BARRIER_PHRASES.find((pattern) => pattern.test(textContent));
  if (barrierPhrase) {
    signals.push({ name: "barrier-phrase", weight: CONCLUSIVE, detail: barrierPhrase.source });
  }

  // Circumstantial: subscription marketing, which honest articles sometimes quote.
  const keyword = PAYWALL_KEYWORDS.find((pattern) => pattern.test(textContent));
  if (keyword && !barrierPhrase) {
    signals.push({ name: "paywall-keyword", weight: CIRCUMSTANTIAL, detail: keyword.source });
  }

  // Circumstantial: the body stops mid-thought.
  //
  // Not counted for short pages. A short post ending in an ellipsis, or carrying a
  // "continue reading" link to its own permalink, is the overwhelmingly common innocent
  // case — and letting it corroborate `short-body` would condemn every brief blog post.
  const truncation = TRUNCATION_PATTERNS.find((pattern) => pattern.test(textContent.trim()));
  if (truncation && !isShort) {
    signals.push({ name: "truncated-ending", weight: CIRCUMSTANTIAL, detail: truncation.source });
  }

  // Circumstantial: the page's own description promises more story than the body delivers.
  //
  // Deliberately does not stack with `short-body`: the two say the same thing about the same
  // page, and a genuinely short post with a long SEO description would otherwise be condemned
  // by its own metadata. So this is evidence only when it is the *sole* size-based signal.
  //
  // Worth only a point, because an overlong description is a quirk of whoever configured the
  // site's SEO plugin, not proof of anything. Weighted any higher, an ordinary article that
  // happened to carry both a long description and a newsletter pitch would clear the bar.
  if (description && description.length > 0 && bodyLength > 0 && !isShort) {
    if (bodyLength < description.length * TRUNCATION_RATIO) {
      signals.push({
        name: "body-shorter-than-description",
        weight: CIRCUMSTANTIAL,
        detail: `body ${bodyLength} < description ${description.length} × ${TRUNCATION_RATIO}`,
      });
    }
  }

  // Circumstantial: too short to be the article it claims to be.
  if (isShort) {
    signals.push({ name: "short-body", weight: CIRCUMSTANTIAL, detail: `${bodyLength} chars` });
  }

  signals.sort((a, b) => b.weight - a.weight);
  const score = signals.reduce((total, signal) => total + signal.weight, 0);
  const isPaywalled = score >= PAYWALL_SCORE_THRESHOLD;

  paywallLog.log(isPaywalled ? "paywall:detected" : "paywall:clean", {
    url,
    score,
    threshold: PAYWALL_SCORE_THRESHOLD,
    signals: signals.map((s) => `${s.name}(${s.weight})`),
    contentLength: textContent.length,
  });

  return {
    isPaywalled,
    signals,
    score,
    url,
    matchedPattern: signals[0]?.detail,
  };
}

/** An element type with the DOM members this module reads. */
type MinimalElement = {
  tagName?: string;
  getAttribute(name: string): string | null;
  parentElement: MinimalElement | null;
};

/** Tags whose contents (and the tags themselves) are never rendered. */
const INERT_TAGS = new Set(["TEMPLATE", "HEAD", "SCRIPT", "STYLE", "NOSCRIPT"]);

/**
 * Whether an element (or any ancestor) is hidden from the reader.
 *
 * A hidden barrier is not evidence of a paywall — sites ship inert paywall markup on every
 * page and reveal it via JS only when a meter trips. Visibility depends on the element AND its
 * ancestors, which is why this walks up the tree rather than checking one tag.
 *
 * "Hidden" here also covers markup that is never rendered at all: an element that *is* an inert
 * container (`<template id="paywall">`) or sits inside one. A `<template>` matching a barrier
 * selector by its own id/class is not a shown barrier.
 *
 * Sees only the inline signals available in static HTML (`hidden`, `aria-hidden`, inline
 * `display:none` / `visibility:hidden`, inert containers). It cannot see visibility set by an
 * external stylesheet — but a real barrier is shown, so the risk is a rare missed positive,
 * never a false one, and that is the safe direction to err.
 */
function isElementHidden(element: MinimalElement): boolean {
  let current: MinimalElement | null = element;

  while (current) {
    if (current.tagName && INERT_TAGS.has(current.tagName.toUpperCase())) return true;
    if (current.getAttribute("hidden") !== null) return true;
    if (current.getAttribute("aria-hidden") === "true") return true;

    const style = (current.getAttribute("style") ?? "").replace(/\s+/g, "").toLowerCase();
    if (style.includes("display:none") || style.includes("visibility:hidden")) return true;

    current = current.parentElement;
  }

  return false;
}

/**
 * Finds a *visible* content-gating element, returning the selector that matched, or null.
 *
 * Parses the page — the article was already parsed once and that DOM discarded by the time
 * detection runs, so this is a second parse. It is cheap relative to the budget the single-DOM
 * parsing fix freed up (a few MB, tens of ms), and it is the only way to answer "is this
 * barrier actually shown?" reliably; a regex over the HTML string cannot.
 */
function findVisibleBarrier(html: string): string | null {
  let document: ReturnType<typeof parseHTML>["document"];
  try {
    ({ document } = parseHTML(html));
  } catch {
    return null;
  }

  for (const selector of BARRIER_SELECTORS) {
    let elements: ArrayLike<MinimalElement>;
    try {
      elements = document.querySelectorAll(selector) as unknown as ArrayLike<MinimalElement>;
    } catch {
      continue; // linkedom rejects some selectors; skip them
    }

    for (let i = 0; i < elements.length; i++) {
      if (!isElementHidden(elements[i])) {
        return selector;
      }
    }
  }

  return null;
}

/**
 * Back-compat wrapper for callers that only have the extracted text.
 * Prefer `detectPaywall`, which can weigh the HTML and description too.
 */
export function detectPaywallInText(textContent: string, url: string): PaywallDetectionResult {
  return detectPaywall({ textContent }, url);
}
