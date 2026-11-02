---
title: "Streaming a summary into the reader re-sent the whole article to Raycast on every token, and a long article ran the extension out of memory"
date: 2026-10-17
category: performance-issues
module: reader-mode-raycast-extension
problem_type: performance_issue
component: frontend
symptoms:
  - "Summarizing a long article crashes Reader with Raycast's \"Command Out of Memory\" error partway through the stream"
  - "The article itself loads fine; only summarizing it crashes"
  - "Heap climbs about 1 MB per streamed token and peaks near 96 MB of the 100 MB limit"
root_cause: memory_leak
resolution_type: code_fix
severity: high
related_components:
  - src/hooks/useArticleReader.ts (SUMMARY_REFRESH_MS, summaryDataRef)
  - src/hooks/useThrottledValue.ts
  - src/views/ArticleDetailView.tsx (memo)
tags: [oom, heap, raycast, detail-view, streaming, ai-summary, react-memo, throttle]
shipped: "raycast/extensions#32483 (merged 2026-10-18)"
---

# Streaming a summary re-sent the whole article on every token

## Problem

Summarizing https://already-clean.goodfire.com/, a 2.1 MB page with an article of about 250,000 characters, crashed Reader with "Command Out of Memory". The fetch, parse and display all worked; the crash came only while the AI summary streamed in.

## Symptoms

- Raycast shows "Command Out of Memory" partway through the summary.
- A temporary heap logger in the view showed the heap climbing about 1 MB per streamed token, reaching 96 MB before the crash. Raycast caps an extension's heap at 100 MB.
- Nothing in `tsc`, the build, lint or the test suite fails. This crash only happens inside Raycast, with a real stream and a long article.

## What Didn't Work

- **Throttling the summary text alone.** Limiting the summary to two screen updates a second cut the peak only to 91 MB. The summary finished, but with too little margin to call it fixed: the reader view still re-rendered for other reasons on every token, and each of those renders sent the article to Raycast too.
- **Assuming the cost was the summary.** The summary is a few thousand characters. The cost was the article it is shown above: each render rebuilt and sent the full Markdown.

## Solution

The mechanism: `useAI` updates the streamed text on every token, which re-rendered the reader view. Each render built the view's Markdown (summary plus the whole article) and sent it to Raycast twice, once as the `Detail` view's `markdown` and once as the "Copy as Markdown" action's content. At about 100 renders a second, each sending around 500,000 characters, allocation outran garbage collection.

The fix has three parts, and it took all three:

1. **Throttle the streamed summary.** `useThrottledValue` (`src/hooks/useThrottledValue.ts`) returns its value at most once per interval, and the latest value always lands when the interval ends. The reader passes the summary through it at `SUMMARY_REFRESH_MS = 500` (`src/hooks/useArticleReader.ts:57`), only while summarizing:

   ```ts
   const currentSummary = useThrottledValue(cachedSummary || summaryData, isSummarizing ? SUMMARY_REFRESH_MS : 0);
   ```

2. **Keep callbacks stable across tokens.** `handleRegenerate` reads the streamed text from a ref (`summaryDataRef`, `src/hooks/useArticleReader.ts:246`) instead of closing over it, so the callback no longer changes on every token.

3. **Memoize the view.** `ArticleDetailView` is wrapped in `React.memo` (`src/views/ArticleDetailView.tsx:102`). With the summary throttled and the callbacks stable, its props change only when the throttled summary does, so the renders between updates never reach Raycast.

Measured in Raycast while summarizing the same article, after the fix: the heap stayed between 22 and 33 MB, and the view re-rendered about every half second instead of on every token.

## Why This Works

A Raycast extension's UI is a description that is serialized and sent to the host on every render. A `Detail` view's cost per render grows with its `markdown`, not with what changed. Streaming makes a long-lived view re-render dozens of times a second, so cost per render times render rate is what fills the heap. The throttle bounds the rate at which the summary changes. The stable callbacks and `memo` make sure nothing else re-renders the view between those changes.

## Prevention

- **Any view that shows a long document and also streams must throttle the stream and memoize the view.** Check every prop for identity changes on each token: a callback that closes over the streamed value defeats `memo` by itself.
- **Measure in Raycast, under the real 100 MB limit.** The test suite runs on a far larger heap. Two methods worked here:
  - A temporary heap logger in the view (`process.memoryUsage().heapUsed` on an interval, tagged so a grep finds every line before shipping) while the person running Raycast performs the action. Remove it before committing.
  - For parse-time code, run the code path under `node --max-old-space-size=100`, the same cap Raycast enforces. A probe that aborts there with `FATAL ERROR: Reached heap limit` is a crash a user will hit. In this release that found two crashes in input-parsing code rather than rendering: a Next.js payload that flattened into too many entries (a 2 MB array of a million values, and a 4.6 MB object with 520,000 keys). It also found a near miss: a page without `</head>` drove the Markdown-alternate lookup to 88 MB, which was fixed in the same release.
- **In tests, assert structure rather than heap growth where you can.** `heapUsed` after a run includes garbage the collector hasn't reclaimed yet, so a heap-delta assertion is noisy: one such test's "failure" at 63 MB was within its own noise. Asserting a bounded structure (for example, how many candidate lists qualified) is deterministic. When a heap number is the only evidence, say so and keep the probe.

## Related Issues

- [../integration-issues/teaser-in-the-reader-is-not-proof-of-a-paywall.md](../integration-issues/teaser-in-the-reader-is-not-proof-of-a-paywall.md): the payload flattening heap crashes and their fixes.
- Shipped in raycast/extensions#32483, merged 2026-10-18.
