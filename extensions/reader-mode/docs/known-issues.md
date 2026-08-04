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
