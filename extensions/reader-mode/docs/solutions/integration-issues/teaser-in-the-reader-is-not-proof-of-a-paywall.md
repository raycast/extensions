---
title: "A teaser in the reader is not proof of a paywall: the full article can be in the page's framework data, and a saved page is not the HTML the extension reads"
date: 2026-10-17
category: integration-issues
module: reader-mode-raycast-extension
problem_type: integration_issue
component: content-extraction / data-payload
symptoms:
  - "Reader shows four paragraphs of an Atlantic article that the browser tab also shows only as a teaser behind a subscribe bar"
  - "The direct fetch is a 403 bot wall, so the reader falls back to the open browser tab and parses a 1,131-character article"
  - "A page saved from the browser with Save As holds the WHOLE article (4,330 characters), so the saved copy and the reader disagree"
  - "No paywall signal fires: the subscribe bar is rendered by script and is not in the HTML"
root_cause: logic_error
resolution_type: code_fix
severity: medium
related_components:
  - src/utils/data-payload.ts (flatten, readPayload, findPayloadArticles)
  - src/utils/readability.ts (MIN_CONTINUATION_SHARE, parseArticle)
  - src/utils/browser-extension.ts (getContentFromTab)
tags: [paywall, next-js, nuxt, __NEXT_DATA__, urql, browser-extension, teaser, payload]
shipped: "raycast/extensions#32483 (merged 2026-10-18)"
---

# A teaser in the reader is not proof of a paywall

## Problem

A logged-out Atlantic article loaded in Reader as a four-paragraph teaser. It looked like a missed paywall, and the first fix built was a paywall detector. The real cause was that the full article was already in the browser tab, inside the page's Next.js data, where Readability never looks.

## Symptoms

- The direct fetch returns 403 (The Atlantic blocks non-browser clients, including Googlebot and Bingbot user agents from a home IP), so the loader takes the open-tab fallback and shows what it parses: 1,131 characters.
- The paywall detector scores 0. The "To read this story, sign in, start a free trial, or subscribe today" bar is drawn by script, so it is in neither the tab's HTML nor the saved HTML.
- A copy of the page saved from the browser parses to the full 4,330-character article.

## What Didn't Work

- **Treating it as a detection gap.** The first fix added a conclusive "declared-gated" signal (the JSON-LD `"isAccessibleForFree":false` plus fewer than 2,000 extracted characters) and routed the tab result through Paywall Hopper. It had a witnessed-red test and would have worked as detection. It was wrong as a fix: the article was recoverable locally, and every bypass method was dead for this site anyway (Googlebot and Bingbot both returned 403, and the Wayback Machine was offline). The change was dropped before it was committed.
- **Diagnosing from a page saved with Save As.** A copy saved from the browser held the whole article in visible `<p>` elements, which pointed toward "the script deletes paragraphs; nothing to recover". The saved file is the server's original response. The extension reads the tab through `BrowserExtension.getContent({ format: "html", tabId })` (`src/utils/browser-extension.ts:275`), which returns the DOM after the site's script ran. The two disagree, so only the second answers what the reader sees.
- **Searching the Next.js data once, with plain JSON.** A first look at `__NEXT_DATA__` in the saved copy found the opening paragraph only once and concluded the payload held only the teaser. The paragraphs were in a urql cache entry whose `data` field is itself a JSON string, so a search that doesn't decode nested JSON misses them.

## Solution

1. **Capture what the extension reads, not what the browser saves.** Add a temporary dump right before the parse in `getContentFromTab` (`src/utils/browser-extension.ts:303`), have the user reload the URL in the dev build once, then remove the dump:

   ```ts
   // TEMP-DUMP: capture the tab's HTML for diagnosis. Remove before shipping.
   (await import("node:fs")).writeFileSync("<scratchpad>/site-tab.html", html);
   ```

   The Atlantic's tab copy held the last paragraph only inside `__NEXT_DATA__`, at `props.pageProps.urqlState.<id>.data` (a JSON string) → `article.content`, as 12 `{"__typename":"ArticleParagraphContent","innerHtml":"…"}` blocks plus 2 related-link blocks.

2. **Read the framework payload, not just the visible page.** The existing Nuxt reader already looked for "a list of ≥3 blocks with an HTML or text field that opens with a paragraph the page shows". Rather than writing a second walker, the Next.js payload is flattened into Nuxt's devalue layout (objects and arrays hold indexes into one flat array), so one walk reads both:
   - `readPayload` checks `__NUXT_DATA__` before `__NEXT_DATA__`, which it reads through `flatten` (`src/utils/data-payload.ts:353`). A missing, oversized, or invalid Nuxt script falls through to Next.js; a Nuxt script that parses but has the wrong shape ends the search.
   - `innerHtml` joined the block body fields (`src/utils/data-payload.ts:50`).
   - A string that holds JSON is parsed as an extra walk root (`src/utils/data-payload.ts:133`). The module was renamed from `nuxt-payload.ts` to `data-payload.ts`.

   Live result: `parse:data-payload { reason: 'longer-than-page', textLength: 4341, recoveredFromPayload: true, candidates: 1 }`, and the article ends with its real last line.

3. **Harden it, because the payload is attacker-controlled web content inside a 100 MB heap.** Codex and Greptile found four real defects in the first version, and each was fixed:

   | Defect | Trace | Fix |
   |---|---|---|
   | Flattening exhausts the heap | A 2,000,036-character `__NEXT_DATA__` with one array of a million zeroes hit `FATAL ERROR: Reached heap limit` under `--max-old-space-size=100`. So did a 4.6 MB object with 520,000 keys | `MAX_FLATTENED_ENTRIES = 200_000` (`src/utils/data-payload.ts:84`), checked inside both the array and object loops. Objects are walked with `for…in` so their keys aren't listed in full first (`:123`). After the fix: `success true heapMB 51` and `success true` |
   | Parsing JSON strings in place destroyed text | A code block whose `text` was a JSON sample became an object and was dropped from the article | Parse into a separate root and leave the string as it was |
   | A comment list replaced a complete short article | A comment quoting paragraph 1 of a 3-paragraph article (33% of Readability's text) cleared the 25% continuation bar | `MIN_CONTINUATION_SHARE = 0.5` (`src/utils/readability.ts:91`). The real Atlantic capture covers 100% (1,130 of 1,130 characters) and the synthetic teasers 99–100%. The bizjournals capture never reaches this check |
   | `__proto__` key lost its subtree | Assigning into `{}` hit the inherited setter | Records built with `Object.create(null)` (`src/utils/data-payload.ts:122`) |

## Why This Works

Next.js and Nuxt pages ship the data they render from as JSON in a script tag. A publisher that gates articles client-side often renders the teaser from data that still holds the whole article, then trims the visible DOM. A plain fetch doesn't help here because the bot wall blocks it. The open browser tab is the one copy that both got past the wall and still carries the data. Reading the payload recovers the article with no network round trip and no bypass. The opening match, size caps, and continuation checks reduce the risk of comment lists or story cards replacing an article; they don't guarantee it is the article.

## Prevention

- **When the reader shows a teaser, first check whether the browser has the article anywhere.** Grep the tab's `getContent` HTML (not a saved page) for a sentence from late in the article. If it's there, the fix is extraction, not detection or bypass.
- **Never diagnose the browser fallback from a page saved with Save As.** It is the server's source, before the site's script trims it.
- **Search framework payloads with nested-JSON decoding.** Data caches (urql, Apollo, React Query) often store results as JSON text inside the JSON.
- **Bound every pass over a payload by entry count, not just byte length.** A small JSON document can expand into far more objects than its byte size suggests. Check the cap inside every loop that allocates.
- Tests: `tests/reader.test.ts`, `describe("Nuxt data payload")`. It covers a synthetic Next.js teaser with a JSON-string cache, the real Atlantic capture (private corpus, `.github/.private/tests/atlantic-teaser-tab.html`), the million-entry payload, a JSON code block, a comment that quotes the opening, and a `__proto__` key. Each one failed before its fix. The 520,000-key object case has no test, because its result is `null` before and after the fix and only the peak memory differs; its evidence is the 100 MB-heap probe.

## Related Issues

- [paywall-detection-is-not-content-usability.md](paywall-detection-is-not-content-usability.md): a different problem in the same area. That doc is about good bypass candidates being rejected; this one is about a teaser that needed no bypass at all.
- Still open: when the direct fetch is blocked, the open-tab result is returned without a paywall check (`src/utils/article-loader.ts:293`). A tab that really holds only a teaser, with no payload to recover, is shown as the article.
- Shipped in raycast/extensions#32483, merged 2026-10-18.
