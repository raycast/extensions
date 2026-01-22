# Reader Extension — Implementation TODO

> **Goal:** Build a Raycast extension that renders web content in a clean, distraction-free Markdown view with optional AI summarization.

---

## Phase 1: Foundation

### 1.1 Project Setup

- [x] Install core dependencies:
  ```bash
  npm install @mozilla/readability turndown turndown-plugin-gfm jsdom @chrismessina/raycast-logger
  npm install -D @types/turndown
  ```
- [x] Add `verboseLogging` preference to `package.json`
- [x] Create `src/utils/logger.ts` with component-specific loggers:
  - `urlLog` — URL resolution events
  - `fetchLog` — HTTP fetch events
  - `parseLog` — Readability/Turndown parsing events
  - `aiLog` — AI summarization events

### 1.2 Command Configuration

- [x] Update `package.json` command to accept URL argument:
  ```json
  {
    "name": "open",
    "title": "Open Reader",
    "arguments": [
      {
        "name": "url",
        "type": "text",
        "placeholder": "https://example.com/article",
        "required": false
      }
    ]
  }
  ```
- [x] Add fallback input sources (priority order):
  1. Command argument
  2. Selected text (if valid URL)
  3. Clipboard (if valid URL)
  4. Browser extension (current tab)
- [x] Add logging for URL resolution:
  - `session:start` — command invoked
  - `resolve:try/success/skip` — each source attempt
  - `session:ready/error` — final outcome

### 1.3 Basic Fetch & Display

- [x] Create `src/utils/fetcher.ts` — fetch HTML from URL
- [x] Handle basic errors (network, 4xx, 5xx, robots.txt rejection)
- [x] Display raw HTML in `<Detail>` as proof of concept
- [x] Add logging for fetch operations:
  - `fetch:start` — request initiated with URL
  - `fetch:success` — response received with status, content length
  - `fetch:error` — failure with error type, status code
- [ ] Add support for fetching content from browser extension
- [ ] Add logging for browser extension fetch:
  - `fetch:extension:start` — request initiated with URL
  - `fetch:extension:success` — response received with status, content length
  - `fetch:extension:error` — failure with error type, status code
- [ ] Add fallback to get content from open tabs via `browserextension.gettabs`

### 1.4 Paywall Handling

- [ ] Add support for paywall detection and bypass
- [ ] Add preference to toggle paywall bypass
- [ ] Add logging for paywall detection:
  - `paywall:detected` — paywall detected
  - `paywall:bypassed` — paywall bypassed
  - `paywall:error` — paywall bypass failed

**Milestone:** Extension accepts URL and displays fetched content.

---

## Phase 2: Content Processing

### 2.1 Readability Integration

- [x] Create `src/utils/readability.ts`
- [x] Implement `isProbablyReaderable()` pre-check
- [x] Parse with `new Readability(document).parse()`
- [x] Extract: `title`, `content`, `byline`, `siteName`, `excerpt`
- [x] Add logging for readability:
  - `parse:precheck` — isProbablyReaderable result
  - `parse:start` — parsing initiated
  - `parse:success` — extracted fields summary (title, content length, has byline)
  - `parse:error` — parsing failure details

### 2.2 Turndown Conversion

- [x] Create `src/utils/markdown.ts`
- [x] Configure TurndownService with sensible defaults:
  ```typescript
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
    bulletListMarker: "-",
  });
  turndown.use(gfm); // tables, strikethrough, task lists
  ```
- [x] Add custom rules if needed (e.g., strip remaining ads/tracking elements)
- [x] Add logging for markdown conversion:
  - `parse:markdown:start` — conversion initiated
  - `parse:markdown:success` — output length, heading count
  - `parse:markdown:error` — conversion failure

### 2.3 Detail View Rendering

- [x] Compose Markdown output:

  ```markdown
  # {title}

  _{byline} · {siteName}_

  ---

  {content}
  ```

- [x] Render in `<Detail markdown={...} />`

**Milestone:** Clean article content displays in Raycast.

---

## Phase 3: AI Summarization

### 3.1 Raycast AI Integration

- [x] Research Raycast AI API for summarization
- [x] Create `src/utils/summarizer.ts`
- [x] Implement summary generation from article content
- [x] Add logging for AI summarization:
  - [x] `ai:start` — summarization initiated with style, content length
  - [x] `ai:success` — summary generated with length, style
  - [x] `ai:error` — AI failure with error details

### 3.2 Summary Styles

- [x] Implement summary style prompts:
      | Style | Prompt Pattern |
      |-------|----------------|
      | **Overview** | One-liner + 3 bullet points of key info |
      | **Opposing Sides** | Two contrasting viewpoints from the article |
      | **The 5 Ws** | Who, What, Where, When, Why |
      | **Explain Like I'm 5** | Simplified language explanation |
      | **Translated Overview** | Overview in selected language + level |
      | **People, Places, & Things** | Key entities with brief context |

### 3.3 Summary Display

- [x] Add summary block at top of Detail view:

  ```markdown
  # {title}

  > **Summary ({style})**
  > {one-liner}
  >
  > - {bullet 1}
  > - {bullet 2}
  > - {bullet 3}

  ---

  {content}
  ```

- [x] Handle loading state while summary generates
- [x] Move summary to metadata sidebar panel
- [x] Add preference to toggle summary sidebar visibility
- [x] Add preference to set default summary style
- [x] Add action to copy summary as Markdown
- [ ] Add Translated Overview language preference

**Milestone:** Articles display with AI-generated summaries.

---

## Phase 4: Polish & Actions

### 4.1 Preferences

- [x] Add all preferences to `package.json`:
      | Preference | Type | Default | Description |
      |------------|------|---------|-------------|
      | `showSummary` | checkbox | `true` | Show AI summary at top |
      | `summaryStyle` | dropdown | `overview` | Default summary style |
      | `preCheckReadability` | checkbox | `true` | Skip if content unlikely readable |
      | `verboseLogging` | checkbox | `false` | Enable debug logging |

### 4.2 Actions

- [x] Implement action panel:
  - **Copy as Markdown** (primary) — full article as Markdown
  - **Copy Summary** — just the summary text
  - **Copy Summary as HTML** — summary rendered to HTML
  - **Copy Article as HTML** — article rendered to HTML (including metadata header)
  - **Export Summary to File** — save summary as `.md` and `.html`
  - **Export Article to File** — save article as `.md` and `.html`
  - **Open in Browser** — open original URL
  - **Copy URL** — copy source URL to clipboard
  - Add Action to get article from Browser (e.g. Import via Raycast Browser Extension)
- [x] Reparse article from browser extension

### 4.3 Error Handling

- [ ] Handle edge cases:
      | Scenario | Behavior |
      |----------|----------|
      | No URL provided | Show form to enter URL |
      | Invalid URL | Show error with suggestion |
      | Fetch failed (network) | "Unable to reach URL" |
      | Fetch failed (403/451) | "Access denied" or "Unavailable for legal reasons" |
      | Not readable (pre-check) | "This page doesn't appear to have article content" with bypass option |
      | Readability parse failed | "Unable to extract content" with option to view raw |
      | Empty content | "No content found" |

### 4.4 Loading States

- [ ] Show loading indicator while fetching
- [x] Show loading indicator while generating summary
- [x] Graceful degradation if summary fails (show content without summary)
- [x] Helpful message if precheck fails — offer to bypass

### 4.5 Documentation

- [ ] Update README with all features and usage examples
- [ ] Add troubleshooting section
- [ ] Document preferences and their effects

### 4.6 Codebase Cleanup

- [ ] Remove unused code and comments
- [ ] Add JSDoc comments for public functions
- [ ] Ensure all error handling is comprehensive
- [ ] Review code organization and separation of concerns

**Milestone:** Production-ready extension with full feature set.

---

## Phase 5: Content Extraction Improvements

> Based on analysis of Safari Reader Mode and Reader View implementations.

### 5.1 Pre-Cleaning HTML (Priority 1)

- [x] Create `src/utils/html-cleaner.ts` with `preCleanHtml()` function
- [x] Implement negative regex patterns to remove:
  - Sidebars (`[class*="sidebar"]`, `[id*="sidebar"]`)
  - Comments (`[class*="comment"]`, `[id*="comment"]`)
  - Subscription boxes (`[class*="subscribe"]`, `[class*="newsletter"]`)
  - Advertisements (`[class*="advertisement"]`, `[class*="ad-"]`)
  - Social/sharing widgets (`[class*="social"]`, `[class*="share"]`)
  - Related content (`[class*="related"]`, `[class*="promo"]`)
  - Navigation (`nav`, `[role="navigation"]`)
  - Complementary content (`[role="complementary"]`)
- [x] Integrate pre-cleaning into `readability.ts` before Readability runs

### 5.2 Turndown Element Removal (Priority 2)

- [x] Add `aside` to Turndown removal list
- [x] Add `nav` to Turndown removal list
- [x] Add `[role="complementary"]` handling
- [x] Add `[role="navigation"]` handling

### 5.3 Lazy-Loaded Image Resolution (Priority 3)

- [x] Add `resolveLazyImages()` function to resolve common lazy-load attributes:
  - `data-src`, `data-lazy-src`, `data-original`, `datasrc`
  - `data-srcset` for responsive images
- [x] Integrate into HTML pre-processing pipeline

### 5.4 Site-Specific Configs (Priority 4)

- [x] Create `src/utils/site-config.ts` with hostname-to-selector mappings
- [x] Add configs for common problematic sites:
  - Wikipedia, Medium, Substack, etc.
- [x] Integrate configs lookup into content extraction
- [ ] Review accuracy of configs and adjust as needed
- [ ] Add site-specific extractors
  - Medium
  - Substack
  - Wikipedia
  - Twitter

### 5.5 Schema.org Detection (Priority 5)

- [x] Detect `[itemprop="articleBody"]` elements
- [x] Detect `[itemtype*="schema.org/Article"]` containers
- [x] Prefer schema.org marked content when available

### 5.6 Carousel Detection (Priority 6)

- [x] Detect carousel patterns (`carousel`, `swiper`, `slider`)
- [x] Remove or deprioritize carousel content

### 5.7 Documentation

- [x] Create `docs/content-extraction.md` documenting all techniques
- [x] Reference Safari Reader and Reader View sources

**Milestone:** Improved content extraction reliability with fewer ads, sidebars, and subscription boxes.

---

## Phase 6: Future Enhancements (v2+)

> Out of scope for v1, but worth tracking:

- [ ] Add fallback for paywalled content
  - [ ] Use 12ft.io, archive.today, & removepaywall.com
- [ ] Add preference to toggle image visibility
- [ ] Caching strategy for recently viewed articles (align with SummaryCache)
- [ ] Support custom summary styles
- [ ] Keyboard shortcuts for summary style switching
- [ ] Offline reading (save articles locally)
- [ ] Reading list integration
- [ ] Export to other formats (PDF, EPUB)
- [ ] Integration with read-later services (Pocket, Instapaper, Omnivore)

---

## Dependencies Summary

### Production

| Package                        | Purpose                       |
| ------------------------------ | ----------------------------- |
| `@mozilla/readability`         | Content extraction & cleaning |
| `turndown`                     | HTML → Markdown conversion    |
| `turndown-plugin-gfm`          | GFM support (tables, etc.)    |
| `jsdom`                        | DOM parsing in Node.js        |
| `@chrismessina/raycast-logger` | Structured logging            |

### Development

| Package           | Purpose                |
| ----------------- | ---------------------- |
| `@types/turndown` | TypeScript definitions |

---

## Open Questions

1. **Raycast AI API**: How do we call Raycast AI for summarization? Need to research the API.
2. ~~**Browser Extension**: How do we get the current tab URL from Raycast Browser Extension?~~ ✅ Resolved: Use `BrowserExtension.getTabs()` and find active tab
3. **Rate Limiting**: Should we add any throttling for rapid URL fetches?
4. **Image Handling**: Should we strip images, keep them, or convert to placeholders?

---

## References

- [Mozilla Readability](https://github.com/mozilla/readability)
- [Defuddle](https://github.com/kepano/defuddle)
- [Turndown](https://github.com/mixmark-io/turndown)
- [Raycast API Docs](https://developers.raycast.com)
- [Logger Integration Guide](./docs/logger-integration.md)
- [Extension Spec](./docs/about.md)
