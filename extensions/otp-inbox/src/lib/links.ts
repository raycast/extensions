import { LinkCandidate, ValidatedLink, LearnedLinkPattern } from "./types";
import {
  AUTO_SELECT_MARGIN,
  AUTO_SELECT_THRESHOLD,
  GENERIC_CTA_PHRASES,
  NEGATIVE_CTA_PHRASES,
  PENALTY_GENERIC_CLICK,
  PENALTY_INVALID,
  PENALTY_NEGATIVE_INTENT,
  PENALTY_NO_VISIBLE_TEXT,
  PENALTY_TRACKING,
  REDIRECT_PARAMETER_NAMES,
  SCORE_BEFORE_FOOTER,
  SCORE_GENERIC_CTA,
  SCORE_LEARNED_EXACT,
  SCORE_LEARNED_PARTIAL,
  SCORE_PATH_INTENT,
  SCORE_SAME_DOMAIN,
  SCORE_STRONG_CTA,
  STRONG_CTA_PHRASES,
  TRACKING_FRAGMENTS,
  VERIFICATION_PATH_TOKENS,
} from "./constants";
import { Anchor } from "./html";
import { getRegistrableDomain } from "./domain";

const REDIRECT_PARAM_NAMES_SET = new Set(REDIRECT_PARAMETER_NAMES);
const STRONG_CTA_SET = new Set(STRONG_CTA_PHRASES);
const NEGATIVE_CTA_SET = new Set(NEGATIVE_CTA_PHRASES);

export interface LinkExtractionContext {
  senderRegistrableDomain: string;
  senderAddress: string;
  learnedPatterns: LearnedLinkPattern[];
}

export function normalizeCtaText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKC")
    .replace(/&[a-zA-Z0-9]+;/g, " ")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function hasPhrase(normalized: string, phrases: Set<string>): boolean {
  for (const phrase of phrases) {
    if (normalized.includes(phrase)) return true;
  }
  return false;
}

function containsStrongCta(text: string): boolean {
  return hasPhrase(normalizeCtaText(text), STRONG_CTA_SET);
}

function containsNegativeCta(text: string): boolean {
  return hasPhrase(normalizeCtaText(text), NEGATIVE_CTA_SET);
}

function hasGenericCta(text: string): boolean {
  return hasPhrase(normalizeCtaText(text), new Set(GENERIC_CTA_PHRASES));
}

function hasVerificationPathToken(pathname: string): boolean {
  const normalized = pathname.toLowerCase();
  return VERIFICATION_PATH_TOKENS.some((token) => normalized.includes(token));
}

function hasTrackingHostOrPath(hostname: string, pathname: string): boolean {
  const combined = `${hostname} ${pathname}`.toLowerCase();
  return TRACKING_FRAGMENTS.some((fragment) => combined.includes(fragment));
}

function hasUnsafeReadableRedirect(href: string, senderRegistrableDomain: string): boolean {
  try {
    const url = new URL(href);
    for (const [name, value] of url.searchParams) {
      if (!REDIRECT_PARAM_NAMES_SET.has(name.toLowerCase())) continue;
      try {
        const inner = new URL(value);
        const innerDomain = getRegistrableDomain(inner.hostname);
        if (innerDomain && innerDomain !== senderRegistrableDomain) {
          return true;
        }
      } catch {
        // opaque value; ignore
      }
    }
  } catch {
    // malformed; let other validation reject it
  }
  return false;
}

export function createPathSignature(pathname: string): string {
  return pathname.toLowerCase().normalize("NFKC").replace(/\/+/g, "/").replace(/\/$/, "") || "/";
}

function isMeaningfulVisibleText(text: string): boolean {
  return normalizeCtaText(text).length > 0;
}

export function extractLinkCandidates(anchors: Anchor[], context: LinkExtractionContext): LinkCandidate[] {
  const candidates: LinkCandidate[] = [];
  const seen = new Set<string>();
  let footerReached = false;

  for (const anchor of anchors) {
    // Detect footer markers in surrounding visible context using simple heuristics.
    const lowerText = anchor.text.toLowerCase();
    if (
      lowerText.includes("privacy") ||
      lowerText.includes("unsubscribe") ||
      lowerText.includes("footer") ||
      lowerText.includes("©") ||
      lowerText.includes("copyright")
    ) {
      footerReached = true;
    }

    const visibleText = anchor.text.trim();
    const normalizedVisibleText = normalizeCtaText(visibleText);

    let parsed: URL | undefined;
    let isHttps = false;
    let hostname = "";
    let pathname = "";
    let registrableDomain: string | null = null;
    const rejectionReasons: string[] = [];

    try {
      if (!anchor.href) throw new Error("missing_href");
      parsed = new URL(anchor.href);
      if (parsed.protocol !== "https:") throw new Error("not_https");
      isHttps = true;
      hostname = parsed.hostname.toLowerCase();
      pathname = parsed.pathname;
      registrableDomain = getRegistrableDomain(hostname);
      if (!registrableDomain) throw new Error("no_registrable_domain");
    } catch {
      // Not a valid candidate
      continue;
    }

    if (context.senderRegistrableDomain && registrableDomain !== context.senderRegistrableDomain) {
      rejectionReasons.push("domain_mismatch");
    }

    const hasPositiveIntent = containsStrongCta(visibleText) || hasGenericCta(visibleText);
    const hasNegativeIntent = containsNegativeCta(visibleText);
    const isSameRegistrableDomain =
      !!context.senderRegistrableDomain && registrableDomain === context.senderRegistrableDomain;

    const hasUnsafeRedirect = hasUnsafeReadableRedirect(anchor.href, context.senderRegistrableDomain);
    if (hasUnsafeRedirect) {
      rejectionReasons.push("unsafe_redirect");
    }

    const pathSignature = createPathSignature(pathname);

    let score = 0;

    if (containsStrongCta(visibleText)) {
      score += SCORE_STRONG_CTA;
    } else if (hasGenericCta(visibleText)) {
      score += SCORE_GENERIC_CTA;
    }

    if (hasVerificationPathToken(pathname) || hasVerificationPathToken(parsed.search)) {
      score += SCORE_PATH_INTENT;
    }

    if (isSameRegistrableDomain) {
      score += SCORE_SAME_DOMAIN;
    }

    if (!footerReached) {
      score += SCORE_BEFORE_FOOTER;
    }

    if (!isMeaningfulVisibleText(visibleText)) {
      score += PENALTY_NO_VISIBLE_TEXT;
      rejectionReasons.push("no_visible_text");
    }

    if (hasTrackingHostOrPath(hostname, pathname)) {
      score += PENALTY_TRACKING;
      rejectionReasons.push("tracking");
    }

    if (normalizeCtaText(visibleText) === "click here" && !hasVerificationPathToken(pathname)) {
      score += PENALTY_GENERIC_CLICK;
      rejectionReasons.push("generic_click");
    }

    if (hasNegativeIntent) {
      score += PENALTY_NEGATIVE_INTENT;
      rejectionReasons.push("negative_intent");
    }

    if (rejectionReasons.includes("domain_mismatch") || rejectionReasons.includes("unsafe_redirect")) {
      score += PENALTY_INVALID;
    }

    const key = `${hostname}::${pathSignature}::${normalizedVisibleText}`;
    if (seen.has(key)) continue;
    seen.add(key);

    candidates.push({
      href: anchor.href,
      hostname,
      registrableDomain: registrableDomain || "",
      visibleText,
      normalizedVisibleText,
      pathSignature,
      originalIndex: anchor.index,
      isHttps,
      hasPositiveIntent,
      hasNegativeIntent,
      isSameRegistrableDomain,
      hasUnsafeReadableRedirect: hasUnsafeRedirect,
      score,
      rejectionReasons,
    });
  }

  // Apply learned pattern bonuses after initial scoring.
  const scored = applyLearnedPatterns(candidates, context);

  // Finalize rejection state: any remaining hard rejection reasons make the candidate ineligible.
  return scored.map((candidate) => ({
    ...candidate,
    score: candidate.rejectionReasons.length > 0 ? candidate.score + PENALTY_INVALID : candidate.score,
  }));
}

function applyLearnedPatterns(candidates: LinkCandidate[], context: LinkExtractionContext): LinkCandidate[] {
  if (!context.learnedPatterns.length) return candidates;

  return candidates.map((candidate) => {
    for (const pattern of context.learnedPatterns) {
      const senderMatch = context.senderAddress.toLowerCase().trim() === pattern.senderAddress.toLowerCase().trim();
      const domainMatch = context.senderRegistrableDomain === pattern.senderRegistrableDomain;
      const hostMatch = candidate.hostname === pattern.targetHostname;
      const ctaMatch = candidate.normalizedVisibleText === pattern.normalizedCtaText;
      const pathMatch = candidate.pathSignature === pattern.pathSignature;

      if (senderMatch && domainMatch && hostMatch && ctaMatch && pathMatch) {
        return { ...candidate, score: candidate.score + SCORE_LEARNED_EXACT, matchedPatternId: pattern.id };
      }

      if (senderMatch && domainMatch && hostMatch && ctaMatch) {
        return { ...candidate, score: candidate.score + SCORE_LEARNED_PARTIAL, matchedPatternId: pattern.id };
      }
    }
    return candidate;
  });
}

export function selectVerificationLink(
  candidates: LinkCandidate[],
): { link: ValidatedLink; remaining: LinkCandidate[] } | undefined {
  const eligible = candidates.filter(
    (c) =>
      c.isHttps &&
      c.isSameRegistrableDomain &&
      !c.hasNegativeIntent &&
      !c.hasUnsafeReadableRedirect &&
      c.rejectionReasons.length === 0 &&
      (c.hasPositiveIntent || hasVerificationPathToken(c.pathSignature)),
  );

  if (eligible.length === 0) {
    return undefined;
  }

  const sorted = [...eligible].sort((a, b) => b.score - a.score);
  const best = sorted[0];
  const second = sorted[1];
  if (best.score >= AUTO_SELECT_THRESHOLD && (!second || best.score - second.score >= AUTO_SELECT_MARGIN)) {
    return {
      link: {
        href: best.href,
        hostname: best.hostname,
        pathSignature: best.pathSignature,
        normalizedCtaText: best.normalizedVisibleText,
        score: best.score,
        selectedBy: best.matchedPatternId ? "learned-pattern" : "automatic",
        matchedPatternId: best.matchedPatternId,
      },
      remaining: sorted.slice(1),
    };
  }

  return undefined;
}

export function getAmbiguousLinks(candidates: LinkCandidate[]): LinkCandidate[] {
  const eligible = candidates.filter(
    (c) =>
      c.isHttps &&
      c.isSameRegistrableDomain &&
      !c.hasNegativeIntent &&
      !c.hasUnsafeReadableRedirect &&
      c.rejectionReasons.length === 0 &&
      (c.hasPositiveIntent || hasVerificationPathToken(c.pathSignature)),
  );
  return [...eligible].sort((a, b) => b.score - a.score);
}
