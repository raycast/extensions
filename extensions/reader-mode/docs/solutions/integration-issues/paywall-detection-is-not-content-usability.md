---
title: "Paywall detection answers \"is this page gated?\", not \"is this content usable?\" — reusing it to reject bypass candidates discards full articles"
date: 2026-09-01
last_updated: 2026-10-17
category: integration-issues
module: reader-mode-raycast-extension
problem_type: integration_issue
component: paywall-hopper / content-extraction
symptoms:
  - "A crawler or archive returns the FULL article, but the reader shows only the intro and the cartoons, or falls back to the truncated preview, or fails outright"
  - "New Yorker / Condé Nast articles render as just the dropcap paragraph plus the cartoon images"
  - "A bypass candidate that is a complete article is rejected because the page still ships a subscription overlay, a \"subscribe\" footer, or an embedded content-gate element"
  - "Three separate review findings (Greptile ×2, Codex) all trace to the same line: the candidate validator's `detectPaywall(...)` call"
root_cause: logic_error
resolution_type: code_fix
severity: high
framework_version: "@raycast/api 2.1.2"
related_components:
  - src/utils/article-loader.ts (validateBypassCandidate)
  - src/utils/paywall-detector.ts (detectPaywall, findVisibleBarrier, BARRIER_PHRASES)
  - src/utils/html-cleaner.ts (preCleanHtml, BARRIER_REMOVE_SELECTORS)
  - docs/known-issues.md
tags: [paywall, content-extraction, paywall-hopper, html-cleaner]
shipped: "raycast/extensions#30627 (merged 2026-09-01); follow-ups in #31933 (merged 2026-10-06)"
---

## The conflation

`detectPaywall` exists to answer one question: **is the page we just fetched gated?** A `true`
verdict triggers the Paywall Hopper — try Googlebot, Bingbot, a social referrer, WallHopper, archive.is, and Wayback for a better copy.

The Hopper's candidate validator (`validateBypassCandidate`, `src/utils/article-loader.ts`) then reused the *same* `detectPaywall` to decide whether each retrieved candidate was worth accepting — rejecting any it flagged. That reuse conflates two different questions:

- **"Is this page gated?"** — what `detectPaywall` measures.
- **"Is this candidate's extracted content usable?"** — what the validator actually needs.

They diverge, and the divergence is the whole bug. A **fully readable** page routinely ships gate
markup: the New Yorker and other Condé Nast sites serve the complete article in the initial HTML with
a leftover subscription overlay; archive.is / Wayback snapshots capture the original page's overlay
and "subscribe" footer; metered sites inject a `content-gate` element mid-article. `detectPaywall`
correctly calls all of these "gated" — and the validator then threw away a complete article, dropping
the reader back to the truncated preview or failing the flow.

## Why it kept re-surfacing (three findings, one cause)

1. **New Yorker shows only cartoons.** Not the validator — the *cleaner*. `[class*="paywall"]`
   deleted every body `<p>`, because Condé Nast tags article paragraphs with that class for
   client-side gating. Fix: scope to `[class*="paywall"]:not(p)` (now applied to every barrier selector, `src/utils/html-cleaner.ts:50`). A gate
   *class* can be on real content.
2. **Full article + leftover overlay is discarded** (Greptile). The validator rejected any
   `detectPaywall`-positive candidate. First fix attempt — skip detection entirely above a text-length
   floor — was **wrong** (Codex caught it): it then accepted a *long upsell page* as the article,
   re-creating the "first 200 suppresses later methods" bug in the other direction.
3. **Embedded gate element in a real article** (Greptile again). An `article-gate` / `content-gate` /
   `regwall` / `piano-*` element inside the article survived cleaning, its gating text landed in the
   extraction, and the always-on phrase check rejected the whole article.

## The fix — three layers

### 1. Split the conclusive signals by reliability (`src/utils/article-loader.ts:135`)

```ts
const isShort = textContent.length < FULL_ARTICLE_TEXT_FLOOR && !parsed.article.recoveredFromPayload; // 2000
const evidence = isShort ? { textContent, html, description } : { textContent, description };
if (detectPaywall(evidence, url).isPaywalled) return null;                  // reject + continue
```

(`recoveredFromPayload` came later: a candidate whose article came from the page's data payload is weighed on its text alone. See [teaser-in-the-reader-is-not-proof-of-a-paywall.md](teaser-in-the-reader-is-not-proof-of-a-paywall.md).)

- **Gating phrases in the extracted text** ("subscribe to read", "already a subscriber?" —
  `BARRIER_PHRASES`, `src/utils/paywall-detector.ts:94`) are checked at **every** length. They are treated as conclusive heuristics: they reject teasers,
  challenge pages, and long upsell pages, which is what still rejects a long non-article, but they can
  also reject a legitimate article that quotes matching language.
- **The visible-barrier DOM overlay** (`findVisibleBarrier`) is checked **only for short candidates**.
  A full article can carry a leftover overlay, so it must not convict a long extraction; for a short
  candidate the overlay may be the only tell of a phraseless teaser, so it still counts there.

### 2. Strip gate UI in the cleaner so its text never reaches the extraction (`src/utils/html-cleaner.ts:50`)

The cleaner strips the detector's **own** exported `BARRIER_SELECTORS`
(`src/utils/paywall-detector.ts:80`), so a gate embedded in the article body is removed
before Readability runs and its phrase can't pollute the extraction. It started as a hand-picked
copy in `NEGATIVE_SELECTORS`; Greptile flagged the copy as incomplete twice (`content-gate`, then
`meter-`/`pw-overlay`/`barrier`) before the cleaner was changed to read the detector's list directly.
**A second copy of a detector's list drifts, so reuse the list itself rather than copying it.**

Two guards apply to every selector: **case-insensitive** (`caseInsensitive()`,
`src/utils/paywall-detector.ts:348`, because real sites capitalize class names) and
**`:not(p)`** (so a site that puts body paragraphs on a gate class isn't gutted).

Two kinds of *content* share a gate selector's substring and must not be deleted, because a site
can split them into several sibling blocks that each fall below the 30% protection guard:
`.subscriber-only` (`CLEANER_KEEP`, `src/utils/html-cleaner.ts:38`) and the `meteredContent` /
`metered-content` body wrappers that `[class*="metered"]` catches on Medium and the NYT
(`CONTENT_WRAPPERS`, `src/utils/html-cleaner.ts:46`). Exempt only the content wrapper, not the
whole class family: exempting all of `[class*="metered"]` also kept a small `meteredMessage` gate,
whose "Subscribe to read" text made the validator reject the full article again (Codex, on the
#31933 review fix).

**This does not weaken detection:** `detectPaywall`/`findVisibleBarrier` parse the **raw** fetch html
(`src/utils/paywall-detector.ts:355`), not the cleaned DOM, so the barrier is still seen. Cleaning only governs
what text Readability extracts.

### 3. The irreducible residual — favor keeping content, and document it (`docs/known-issues.md:38`, `:50`)

A long extraction with a visible overlay but **no gating phrase** is genuinely
**indistinguishable** between a full article with a leftover overlay and a long non-article. No
length or DOM signal separates them (the repo's own known-issues note already said so). The deliberate
choice: **never discard a complete article** (the common, high-impact case) over rejecting a rare
phrase-free long teaser. Same for the 30%-text protection guard leaving a very text-heavy gate in place.

## The transferable principle

**A signal that detects a *condition* is not a signal about *usability*.** Before reusing a
detector's boolean to gate acceptance/rejection of content, ask whether the condition and the
usability actually coincide — here, "page is gated" and "extraction is unusable" looked identical and
were not. When they diverge, either (a) pick the sub-signal that *is* about usability (gating text in
the body — a useful heuristic, not proof that the extraction is a barrier), and (b) fix the pollution at its
source (strip gate UI in the cleaner) rather than teaching the consumer to tolerate it. And when a
case is irreducibly ambiguous, decide by which failure costs the user more: prefer showing a rare teaser
over losing real content.

## Verification

Each layer has a witnessed-red test (`tests/reader.test.ts`): New Yorker full-article extraction
(1,342 → 99,651 chars on the live page), full-article-with-overlay accepted, long-upsell rejected,
short-challenge and short-visible-barrier-teaser rejected, embedded lowercase and capitalized gate
stripped. `tsc --noEmit` 0, `ray build` 0, `ray lint` clean, `npm test` 43/43. Reviewed adversarially
by Codex at each round before shipping. Follow-ups shipped in raycast/extensions#31933 (merged
2026-10-06): the shared barrier list, the `.subscriber-only` and `meteredContent` carve-outs, and
tests for segmented subscriber-only and metered bodies plus a metered gate message (`npm test` 56/56).
