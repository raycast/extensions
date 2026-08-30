# Known Issues

## Bracket Rendering

Square brackets `[text]` that appear in article content (such as editorial insertions in quotes) are automatically converted to parentheses `(text)` to prevent Raycast's markdown renderer from interpreting them as LaTeX math notation. This is a workaround for a rendering limitation and means the displayed text may differ slightly from the original source material.

## Image Rendering

Image alt text and title attributes are automatically stripped to ensure proper rendering in Raycast. Images are displayed as `![](url)` without descriptive text. This prevents rendering issues where long alt text or title attributes (especially those containing quotes) can break the markdown image syntax.

Additionally, relative image URLs (e.g., `/image.jpg`) are automatically converted to absolute URLs using the page's base URL to ensure images load properly.

## Paywall Detection: Barriers Hidden by External Stylesheets

**Status:** Accepted limitation. Reviewers and contributors: please don't re-open this without reading the rationale below — it has been analyzed repeatedly and the conclusion holds.

`detectPaywall` (`src/utils/paywall-detector.ts`) decides whether a barrier element is a real, _visible_ gate or inert markup by parsing the page and checking each candidate's computed visibility via `isElementHidden`. That check sees everything static HTML can express:

- the `hidden` attribute,
- inline `style="display:none"` / `visibility:hidden`,
- inert containers (`<template>`, `<head>`, `<script>`, `<style>`, `<noscript>`),
- a hidden **ancestor** (the check walks the ancestor chain),
- and class/id selectors hidden by the page's own inline `<style>` blocks (`collectHidingRules`).

**What it cannot see:** a hiding rule in an **external** stylesheet (`<link rel="stylesheet" href="…">`). The detector runs with no network access in the scoring path, so it never fetches linked CSS. If a readable article ships an inactive paywall template in the body — e.g. `<div class="article-gate">…</div>` — and hides it purely via a linked stylesheet, `findVisibleBarrier` treats it as visible and the page is scored as paywalled.

### Why it isn't fixed

- **No external-CSS access.** Fetching linked stylesheets during scoring would add network latency and failure modes to a path that is intentionally synchronous and offline. That's a redesign, not a patch.
- **No reliable corroboration.** We looked at requiring a second signal (a gating phrase in the extracted text, a truncated body) so a lone barrier element couldn't convict. On the real paywalled pages we test against, the barrier element is the _only_ signal that survives Readability extraction — the gating text and truncation markers are stripped along with the barrier region — so requiring a second signal drops real detections. Real barriers are also heterogeneous (from a large gating region down to a single subscribe button), so no text-length or element-size threshold separates them from the false-positive case.

### Why the impact is bounded

A misclassification here sends the page through the Paywall Hopper bypass, but retrieved content **only replaces** the original when it is at least 20% longer than what was already parsed (`src/utils/article-loader.ts`). The false-positive case is, by definition, an _already-complete_ article, which is unlikely to gain 20% from an archive — so the realistic cost is a redundant (and slow) bypass attempt, not swapped-out content.

If this is ever worth closing, the fix is a detection-layer redesign (e.g. an opt-in CSS fetch, or a corroboration model trained on a larger corpus), not a tweak to `isElementHidden`.

## Accepting a bypass candidate that still carries an overlay

When the Paywall Hopper retrieves a candidate, `validateBypassCandidate` (`src/utils/article-loader.ts`) has to decide whether it is the real article. It applies the same visible-barrier signal above, but **only to short candidates** (`< FULL_ARTICLE_TEXT_FLOOR`). For a candidate with a full article's worth of extracted text, a visible overlay is ignored and only gating **phrases in the text** can reject it.

### Why

Archives (archive.is, Wayback) and client-gated sites (New Yorker, Wired) routinely return the **complete** article with a leftover subscription overlay or "subscribe" footer still in the markup. Convicting those on the overlay alone discarded a full article and dropped the reader back to the truncated preview — the common, high-impact failure. A genuine article body never contains gating phrases ("subscribe to read", "already a subscriber?"), while teasers, challenge pages, and long upsell pages do — so the text-phrase check catches long non-articles without punishing real ones.

### The residual, and why it's left open

A long non-article whose **only** tell is a visible overlay — no gating phrase in its extracted text (image-only or non-English gating) — is accepted. This is the exact opposite horn of the full-article-with-overlay case above: the two are indistinguishable from the available signals (see "No reliable corroboration"). The choice deliberately favors **never discarding a complete article** over rejecting a rare phrase-free long teaser, because the former is common and costs the reader real content while the latter is rare and costs a partial render. Short candidates keep the overlay check, so a phrase-free short teaser is still caught.
