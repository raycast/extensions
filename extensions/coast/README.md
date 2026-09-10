# Coast

An independently maintained Raycast integration for local Coast screen history. Search captured text, inspect screenshots, browse timelines and usage, jump back into Coast, and query the same evidence through Raycast AI. This extension is not affiliated with or endorsed by Coast or Attention Engineering, Inc.

## Requirements

- Coast app running in the background (the CLI bridge requires it)
- `coast` CLI on PATH, or set the Coast Binary Path preference

## Commands

- **Browse Screenshots**: native three-column Grid with local previews, range presets, app/domain filters and 12-item pagination. Every representative capture returned for the range remains accessible; title filtering covers all loaded captures, including later pages.
- **Saved Searches**: create, edit, delete and rerun local query/filter definitions with rolling today, 7-day or 30-day ranges
- **Search Coast**: full-text search across OCR text and frame titles
- **Coast Activity**: total, app, domain, and session usage across several date ranges
- **Browse Coast Timeline**: detailed recent timeline or representative highlights, with screenshots and OCR
- **Capture Current Screen**: capture through Coast and copy the image to the clipboard
- **Coast Screen Time**: optional menu bar item with today's total and top applications

Search and timeline results can show the recorded screenshot, copy OCR or the image, open the original URL, and jump to the exact moment in Coast.

## AI Tools

Available via `@coast` in AI Chat, Quick AI, or Root Search:

- `search-captures`: full-text search across screen history
- `get-capture`: full OCR text for a single frame by ID
- `get-capture-image`: screenshot export for a frame
- `get-ocr-boxes`: positioned OCR boxes
- `get-accessibility-tree`: recorded macOS UI structure
- `get-accessibility-coverage`: accessibility capture diagnostics
- `list-coast-filters`: application bundle IDs and domains
- `sample-activity`: representative activity segments
- `browse-timeline`: chronological short-range reconstruction
- `app-breakdown`: totals and app or domain usage
- `recent-activity`: chronological recording sessions
- `create-coast-link`: read-only deep link to a moment
- `capture-current-screen`: confirmed current-display capture with optional OCR
- `get-adjacent-moment`: previous/next selected capture within 15 minutes, retaining app/domain filters
- `find-related-moments`: explicit URL, title or application matches with a reason and coverage caveat
- `use-saved-search`: list and run saved filters; AI cannot create or delete definitions

## Exploring Activity

Press Return on an application or domain to explore its sessions, then open a session to browse representative moments. Consecutive captures with the same app, title, and URL are grouped when no more than two minutes apart. Groups retain their selected frames; they do not claim to include every recorded frame.

Inspect a moment to switch between screenshot, OCR, UI tree, OCR boxes, and metadata. In the inspector, Return opens the selected moment in Coast; Command-Return opens its original URL when one was recorded. Search and gallery results keep Return for Inspect Moment. Explore Around This Moment opens up to 15 minutes on either side. Times use your Mac's local timezone, shown explicitly in details. Copy Evidence includes a timestamp and Coast link.

The `explore-around-moment` AI tool supports the same context expansion by frame ID.

The inspector supports Previous/Next Moment with Command-Left/Right, retaining the loaded sequence and filters. Load more results in the parent view before opening the inspector to expand that sequence. These are representative captures, not every recorded frame. From a standalone capture the sequence spans 15 minutes on either side of the starting frame. Related moments compare URLs (ignoring only fragments), exact case-insensitive titles within the same application, or representative application activity. Related results expose candidate pages, including pages with no exact matches; continue while more candidates exist. Matches are not exhaustive when a URL was not visible in OCR or the title.

Search previews are screenshot-first: a loading state is replaced by the image without first flashing OCR. Open the inspector for OCR, accessibility text, OCR boxes or metadata. Use Save Search from search results to retain the current query and filters.

## Evidence and Time

Search page size controls each load, not the total accessible matches. Search and usage rankings grow their result prefix with a one-item lookahead because Coast's CLI has no offset parameter. A full page is not treated as the complete result set. Search fixes an upper time bound when no range was supplied; continue with the returned scope. Coast's index remains live, so delayed indexing can change pages. Narrow fixed date ranges for repeatable investigation.

AI list tools expose `pagination` with `has_more`, the effective page size, `next_offset` when more remains, and `total_count` only when known. Unknown or unavailable values are omitted, not reported as zero. Repeat the same query and filters with the returned offset to continue. An explicit `limit` sets a maximum for that response; safeguards cap the page size, not the reachable result set. Search, saved search, sessions, and filter identifiers additionally return `next_input` while more remains. OCR and accessibility lookup expose character-page continuation; offsets count Unicode code points. Single current-screen captures include any OCR overflow in `ocr_text_tail`, without capturing again. Exhausting a page sequence means all returned matches or representatives were traversed, not that Coast recorded or recognized everything.

Local CLI responses retain a 20 MB buffer and 30-second timeout. If a large source query exceeds those budgets, the extension reports an error and asks for a narrower range or filters instead of reporting empty or complete results. Raycast can also stop automatic pagination under memory pressure; use narrower scopes rather than assuming the loaded results are exhaustive. Activity and saved results pause automatic loading at 1,000 rows and offer explicit continuation.

AI capture evidence preserves the source timestamp and adds UTC, local display time, local timezone and a timestamp-basis label. Offset-free Coast timestamps are interpreted as the Mac's local wall time, not UTC. On a Manila-configured Mac this is Asia/Manila. Historic records from a different recorder timezone are not automatically corrected.

OCR is noisy and can contain overlays. Source warnings are preserved. Accessibility `has_tree`, `is_partial_tree` and `stored_bytes` remain Coast's storage reports; `has_payload`, `returned_bytes`, `returned_characters` and `truncated` describe the returned text. Conflicting storage metadata produces an explicit warning and unknown completeness rather than a fabricated byte count. Filtered or complete-as-reported output does not prove complete screen coverage.

## Development and Verification

Use `bun run dev` for development and `bun test tests` for synthetic regression tests. The tests exercise search, frame lookup, image/accessibility inspection and deep-link creation through the CLI wrapper with a synthetic transport. They also cover metadata conflicts, timezone offsets, filter retention, exact matching, saved-filter persistence, and the schemas emitted by a fresh Raycast build. `ai.json` contains separate Raycast AI routing evals with synthetic tool responses. Run `bun run ray evals -I` for all evals, or add `--only 6` for the multi-tool inspection chain. The package runner supplies the PATH needed by the eval builder's child process. These model evals do not query live Coast history or prove live screenshot ingestion.

The native Raycast AI tools use the Coast CLI internally. There is no second native backend or fallback layer. CLI failures surface as errors and are not silently retried through another integration.

For Store review, use `npm ci`, `npm run build`, and `npm run lint`. Finish a distribution-build UI click-through, AI routing evals, latest-API compatibility, and approved Store screenshots before submitting. Prefer synthetic screenshots; publish real screen-history images only with explicit approval for those exact images and their visible content.

SDK `2.2.1` bundles a TypeScript compiler whose tool-schema pass cannot locate its standard library. `tsconfig.json` explicitly includes `typescript/lib/lib.es5` in `types` so array input declarations resolve correctly. The extension maintainer should remove this compatibility reference once a newer SDK generates the same array schemas without it. No SDK internals are patched.

Concrete AI output contracts avoid the SDK extractor's unsupported nullable unions and inferred spread members. Optional fields are omitted when unavailable. The schema regression checks ensure capture identity and continuation fields survive packaging.

The extension icon is exported from the official Coast Local application's macOS icon. The runtime asset is `assets/extension_icon.png` (512 by 512 PNG). Coast branding identifies the integration; it does not indicate affiliation or endorsement.

## Privacy

Coast remains the local source of truth, but Raycast AI tool results are sent to the configured Raycast AI model provider. This can include OCR, screenshot paths, accessibility-tree text, domains, application names, and usage data. The current-screen tool always asks for confirmation. Coast's recording exclusions continue to apply.

## Preferences

- **Coast Binary Path**: path to the `coast` binary if not on PATH
- **Search Page Size**: results per load (default 20, maximum 200), not a total result cap. The existing preference value is retained when upgrading.
