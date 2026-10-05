# Gotchas

Non-obvious behaviors and edge cases that can trip up developers and LLM agents working on this codebase.

---

1. **`capabilities: undefined` = full access** — All capability checks use `capabilities?.X !== false`, never `=== true`. Graphs added before the capability detection system have no `capabilities` field. Treating `undefined` as full access is intentional backward compat, not a bug. See `list.tsx`, `quick-capture.tsx`, `search.tsx` for examples of this pattern.

2. **DNP UID vs page title are different formats** — The daily note page UID is `MM-DD-YYYY` (e.g., `"03-09-2026"`, via `utils.ts → todayUid()`). The page title is `"March 9th, 2026"` (English ordinal, via `roam-api-sdk-copy.ts → dateToPageTitle()`). The Append API accepts both: `{"daily-note-page": "MM-DD-YYYY"}` for UIDs, or the full title string. Getting the title format wrong (e.g., missing the ordinal suffix) creates a non-DNP page instead.

3. **Tag placement without `{tags}` variable** — When a template's `contentTemplate` does NOT contain `{tags}`, tags are appended to the **first line only** (not at the end of the full output). This is legacy behavior preserved for backward compat. Controlled by the `templateHadTagsVar` flag in `roamApi.ts → processCapture()`.

4. **1-space → 2-space indentation auto-doubling** — Legacy templates used 1-space-per-level indentation. The Append API requires 2+ spaces per nesting level. `processCapture()` auto-detects lines starting with ` - ` (1 space) and doubles all indentation. This only applies to legacy formats — new templates should use 2-space indentation.

5. **Multi-graph search errors must be strings** — `useCachedPromise` requires JSON-serializable data. In `search.tsx`, API errors are stringified (not thrown as Error objects) so they can be cached alongside successful results.

6. **Content truncation at 5000 chars** — `utils.ts → detailMarkdown()` truncates block content at 5000 characters to prevent Raycast UI freezes on large code blocks. Shows a "TRUNCATED RESULT" suffix.

7. **`nest-under` picks bottom-most match** — If a page has multiple top-level blocks with the same text as the `nest-under` string, the Roam Append API appends under the last (bottom-most) matching block, not the first.

8. **400 vs 401 ambiguity on token errors** — Roam's Backend API sometimes returns 400 instead of 401 for invalid or malformed tokens. This is a known Roam bug that won't be fixed for backward compat. Our SDK's error handling in `roam-api-sdk-copy.ts` treats these as separate cases, but users may see confusing error messages.

9. **Outbox processes at capture time, not retry time** — `captureWithOutbox()` calls `processCapture()` immediately, storing the processed content. On retry, `appendBlocks()` is called directly with the stored output. This means `{time}` and `{today}` reflect the original capture moment. If a capture targeted the daily note, the resolved date is stored — retrying on a different day still targets the original day's page.

---

## See Also

- `docs/roam-api-reference.md` — Rate limits, error codes, API behaviors
- `docs/capture-templates.md` — Template variable substitution details
