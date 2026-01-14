# Paywall Hopper — Implementation TODO

> **Feature:** Fallback content retrieval for paywalled articles  
> **Spec:** [paywall-hopper.md](./paywall-hopper.md)  
> **Branch:** `paywall-hopper`

---

## Phase 1: Foundation

### 1.1 Paywall Detection Module (Standalone)

> **Architecture Decision:** Paywall detection is implemented as standalone utility functions
> in `src/extractors/_paywall.ts` rather than extending `BaseExtractor`. This keeps the
> Paywall Hopper feature cleanly separated and easy to remove if needed.

- [x] Create `src/extractors/_paywall.ts` with standalone utility functions
- [x] Define paywall detection constants:
  - `MIN_ARTICLE_LENGTH` (500 chars)
  - `TRUNCATION_PATTERNS` regex array
  - `PAYWALL_KEYWORDS` regex array
  - `PAYWALL_SELECTORS` string array
  - `SITE_PAYWALL_SELECTORS` record for site-specific selectors
- [x] Export `PaywallDetectionResult` interface
- [x] Export `detectPaywall(document, url, textContent)` function
- [x] Export `getSitePaywallSelectors(url)` helper
- [x] Export `isKnownPaywalledSite(url)` helper

### 1.2 Generic Paywall Detection

- [x] Implement generic heuristics in `detectPaywall()`:
  - [x] Short content detection (< 500 chars)
  - [x] Truncation marker detection ("Continue reading...", ellipsis, etc.)
  - [x] Paywall keyword detection ("Subscribe", "Members only", etc.)
  - [x] Paywall overlay element detection (`[class*="paywall"]`, etc.)

### 1.3 Logging Setup

- [x] Add `paywallLog` logger to `src/utils/logger.ts`
- [x] Define log events:
  - `paywall:detected`
  - `paywall:not-detected`
  - `bypass:*:start/success/failed` (to be used in Phase 5)

**Milestone:** Generic paywall detection working for unknown sites.

---

## Phase 2: Site-Specific Detection

### 2.1 Site-Specific Selectors

> Site-specific paywall selectors are now defined in `SITE_PAYWALL_SELECTORS` in
> `src/extractors/_paywall.ts` rather than in individual extractors.

- [x] Medium selectors added to `SITE_PAYWALL_SELECTORS`
- [x] NYT selectors added to `SITE_PAYWALL_SELECTORS`
- [x] WSJ selectors added to `SITE_PAYWALL_SELECTORS`
- [x] WaPo selectors added to `SITE_PAYWALL_SELECTORS`
- [x] The Atlantic selectors added to `SITE_PAYWALL_SELECTORS`
- [x] Known paywalled domains list in `isKnownPaywalledSite()`

### 2.2 Soft Paywall Detection (200 OK with preview content)

> Sites like NYTimes return HTTP 200 but serve truncated/preview content with paywall messaging.
> This requires post-parse text analysis to detect.

- [x] Add NYTimes-specific text patterns to `PAYWALL_KEYWORDS`:
  - "You have a preview view of this article"
  - "Thank you for your patience while we verify access"
  - "Please exit and log into your Times account"
  - "Want all of The Times? Subscribe"
- [x] Create `src/utils/paywall-detector.ts` with `detectPaywallInText()` function
- [x] Integrate soft paywall detection in `article-loader.ts` (Step 2.5)
- [x] Only trigger for known paywalled sites to avoid false positives
- [x] Compare bypassed content length to original (require 20% improvement)

### 2.3 Future Site Additions (as needed)

- [ ] Add more site-specific selectors as discovered
- [ ] Refine existing selectors based on testing

**Milestone:** Site-specific paywall detection for major paywalled sites, including soft paywalls.

---

## Phase 3: Googlebot Fetch

### 3.1 Fetcher Extension

- [x] Add `GOOGLEBOT_USER_AGENT` constant to `src/utils/fetcher.ts`
- [x] Add `GOOGLEBOT_TIMEOUT_MS` constant (15000ms)
- [x] Create `fetchHtmlAsGooglebot()` function
- [x] Handle same error cases as `fetchHtml()`

### 3.2 Integration

- [x] Log Googlebot fetch attempts and results (`bypass:googlebot:start/success/failed`)
- [ ] Add Googlebot fetch as first bypass attempt in hopper flow (Phase 5)

**Milestone:** Googlebot User-Agent bypass working.

---

## Phase 4: Archive Service Integration

### 4.1 Archive Fetcher Module

- [x] Create `src/utils/archive-fetcher.ts`
- [x] Define `ArchiveFetchResult` type:

  ```typescript
  interface ArchiveFetchResult {
    success: boolean;
    html?: string;
    archiveUrl?: string;
    service: 'archive.is' | 'wayback';
    timestamp?: string;
    error?: string;
  }
  ```

### 4.2 archive.is Integration

- [x] Add `ARCHIVE_IS_TIMEOUT_MS` constant (45000ms)
- [x] Implement `fetchFromArchiveIs(url)` function
- [x] Handle redirects to actual snapshot URL
- [x] Extract and return snapshot URL for attribution
- [x] Log archive.is fetch attempts (`bypass:archive-is:start/success/failed`)

### 4.3 Wayback Machine Integration

- [x] Add `WAYBACK_TIMEOUT_MS` constant (30000ms)
- [x] Implement `fetchFromWayback(url)` function
- [x] Use Wayback availability API first
- [x] Fetch from snapshot URL
- [x] Extract and format timestamp for attribution
- [x] Log Wayback fetch attempts (`bypass:wayback:start/snapshot-found/success/failed`)

**Milestone:** Archive service fetching working.

---

## Phase 5: Paywall Hopper Orchestration

### 5.1 Hopper Module

- [x] Create `src/utils/paywall-hopper.ts`
- [x] Define `PaywallHopperResult` type
- [x] Define `ArchiveSource` type for article state
- [x] Export `createArchiveSource()` helper

### 5.2 Bypass Sequence

- [x] Implement `tryBypassPaywall(url)` function
- [x] Execute bypass attempts in order:
  1. Googlebot User-Agent fetch
  2. archive.is fetch
  3. Wayback Machine fetch
- [x] Return first successful result
- [x] Log all attempts (`hopper:start/trying/success/failed`)

### 5.3 Article Loader Integration

- [x] Add `enablePaywallHopper` option to `LoadArticleOptions`
- [x] Modify `loadArticleFromUrl()` in `src/utils/article-loader.ts`
- [x] On 403 blocked AND Paywall Hopper enabled:
  - [x] Check for open browser tab first (subscriber flow)
  - [x] If no tab, invoke `tryBypassPaywall()`
- [x] Parse bypassed content and format with archive annotation
- [x] Pass archive source metadata through to article state

**Milestone:** Full bypass flow working end-to-end.

---

## Phase 6: Article State & Types

### 6.1 Type Extensions

- [x] Add `archiveSource` field to `ArticleState` in `src/types/article.ts`
- [x] Import `ArchiveSource` type from `paywall-hopper.ts`

### 6.2 Markdown Annotation

- [x] Add `ArchiveAnnotation` interface to `src/utils/markdown.ts`
- [x] Add `archiveSource` option to `FormatArticleOptions`
- [x] Implement `formatArchiveAnnotation()` helper function
- [x] Add archive source annotation when `archiveSource` is present:

  ```markdown
  > 📦 **Archived Copy** — Retrieved from [archive.is](url) (timestamp)
  ```

**Milestone:** Archive attribution visible in article display.

---

## Phase 7: UI & Preferences

### 7.1 Preferences

- [x] Add `enablePaywallHopper` preference to `package.json`
- [x] Read preference in `src/open.tsx`
- [x] Pass `enablePaywallHopper` to all `loadArticleFromUrl()` calls

### 7.2 Paywall Detection UI

- [x] Paywall Hopper runs automatically on 403 blocked pages (when enabled)
- [x] Falls back to BlockedPageView only after all bypass methods fail
- [ ] *(Future)* Show manual "Try Paywall Hopper" option in BlockedPageView

### 7.3 Actions

- [x] Add "Copy Archived URL" action (when `archiveSource.url` present)
- [ ] *(Future)* Add "Try Paywall Hopper" manual action for retries

### 7.4 Toast Notifications

- [x] Show toast when bypass succeeds (displays source: Googlebot/archive.is/Wayback)

**Milestone:** Core UI integration complete.

---

## Phase 8: Subscriber Flow

### 8.1 Browser Tab Detection

- [ ] When paywall detected, check for matching browser tab
- [ ] If tab found, prioritize "Import from Browser Tab" action
- [ ] If tab not found, show "Open in Browser & Import" option

### 8.2 Import Flow Enhancement

- [ ] Ensure browser tab import works for authenticated content
- [ ] Add clear messaging for subscribers about using their session

**Milestone:** Subscriber-friendly flow complete.

---

## Phase 9: Testing & Polish

### 9.1 Manual Testing

- [ ] Test with WSJ paywalled article
- [ ] Test with NYT metered article
- [ ] Test with Medium member-only story
- [ ] Test with The Atlantic paywalled article
- [ ] Test subscriber flow with browser tab import
- [ ] Test with Paywall Hopper disabled

### 9.2 Edge Cases

- [ ] Handle archive service timeouts gracefully
- [ ] Handle archive service unavailability
- [ ] Handle sites that block Googlebot
- [ ] Handle malformed archive responses

### 9.3 Logging Review

- [ ] Verify all log events fire correctly
- [ ] Ensure debug info is helpful for troubleshooting

### 9.4 Documentation

- [ ] Update main README with Paywall Hopper feature
- [ ] Add troubleshooting section for common issues

**Milestone:** Feature complete and tested.

---

## Phase 10: Future Enhancements (v2+)

> Out of scope for initial implementation, tracked for future work.

- [ ] Cache archive URL content for quick re-access
- [ ] Domain-specific bypass rules from Bypass Paywalls Clean
- [ ] Jina.ai integration (reference Webpage to Markdown)
- [ ] removepaywall.com as additional fallback
- [ ] Cookie manipulation techniques
- [ ] Google Cache fallback (if still available)
- [ ] Parallel fetching (hit multiple sources simultaneously)

---

## Dependencies

No new npm packages required. Uses existing:

- `linkedom` for DOM parsing
- `@mozilla/readability` for content extraction
- Native `fetch` for HTTP requests

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/utils/paywall-hopper.ts` | Orchestrate bypass attempts |
| `src/utils/archive-fetcher.ts` | Fetch from archive services |

## Files to Modify

| File | Changes |
|------|---------|
| `src/extractors/_base.ts` | Add `isPaywalled()`, `getPaywallSelectors()` |
| `src/extractors/medium.ts` | Add Medium-specific paywall detection |
| `src/utils/fetcher.ts` | Add `fetchHtmlAsGooglebot()` |
| `src/utils/article-loader.ts` | Integrate Paywall Hopper flow |
| `src/utils/markdown.ts` | Add archive source annotation |
| `src/utils/logger.ts` | Add `paywallLog` logger |
| `src/types/article.ts` | Add `archiveSource` field |
| `src/open.tsx` | Add UI for paywall detection, actions |
| `package.json` | Add `enablePaywallHopper` preference |

---

## References

- [Paywall Hopper Spec](./paywall-hopper.md)
- [Content Extraction Docs](./content-extraction.md)
- [Logger Integration Guide](./logger-integration.md)
