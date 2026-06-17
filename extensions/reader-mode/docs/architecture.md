# Architecture

This document describes the technical architecture of the Reader extension and how its components work together.

## Overview

Reader is built around a pipeline architecture that transforms web URLs into clean, readable Markdown content with optional AI summaries. The extension follows Raycast's extension patterns with React hooks for state management and the Detail component for rendering.

## Core Flow

```
URL Input → Article Loading → Content Extraction → Markdown Conversion → AI Summarization → Display
```

### 1. URL Resolution (`src/utils/url-resolver.ts`)

The extension accepts URLs from multiple sources in priority order:

1. **Command argument** — User provides URL when invoking command
2. **Selected text** — Valid URL selected in another app
3. **Clipboard** — Valid URL copied to clipboard
4. **Active browser tab** — Via Raycast Browser Extension

Each source is tried in order until a valid URL is found. All URL resolution events are logged via `urlLog`.

### 2. Article Loading (`src/utils/article-loader.ts`)

The article loader orchestrates fetching and extraction:

- **Direct fetch** — Fetches HTML via standard HTTP request
- **Paywall detection** — Checks for soft/hard paywalls
- **Paywall bypass** — Falls back to archive services if enabled
- **Browser extension fallback** — Handles 403 blocked pages
- **Error handling** — Surfaces network errors, access denied, etc.

Key functions:
- `loadArticleFromUrl()` — Main entry point for loading articles
- `loadArticleViaPaywallHopper()` — Bypass paywalls via archive services

### 3. Content Extraction

Content extraction uses a multi-layered approach. See [content-extraction.md](./content-extraction.md) for detailed pipeline documentation.

**Three extraction methods:**

#### Site-Specific Extractors (`src/extractors/`)

For sites requiring custom logic that completely bypasses Readability:

- **HackerNews** — Transforms comment threads into readable format
- **GitHub** — Extracts README content and repository metadata
- **Reddit** — Converts posts and comments to clean format
- **Medium** — Handles Medium's custom article structure

All extractors extend `BaseExtractor` and implement:
- `canExtract()` — Returns true if this extractor handles the URL
- `extract()` — Returns extracted content, textContent, and metadata
- `siteName` — Human-readable site name

#### Site Configuration (`src/utils/site-config.ts`)

For simpler sites that just need selector adjustments (works WITH Readability):

```typescript
[
  /^example\.com$/i,
  {
    name: "Example",
    articleSelector: ".article-body",
    removeSelectors: [".ads", ".sidebar"],
  },
]
```

Site configs are applied during HTML pre-cleaning before Readability runs.

#### Mozilla Readability (Fallback)

Default extraction for standard article pages. Automatically identifies and extracts:
- Article title
- Author byline
- Site name
- Publication date
- Main content
- Excerpt

### 4. Content Processing Pipeline

```
Raw HTML
   ↓
makeUrlsAbsolute() — Convert relative URLs
   ↓
preCleanHtml() — Remove ads, sidebars, navigation
   ↓
resolveLazyImages() — Fix lazy-loaded images
   ↓
Site Config / Extractor — Custom extraction logic
   ↓
Readability.parse() — Extract article content
   ↓
htmlToMarkdown() — Convert to Markdown
   ↓
Post-processing — Fix images, brackets, quotes
   ↓
Clean Markdown Output
```

### 5. Markdown Conversion (`src/utils/markdown.ts`)

HTML content is converted to Markdown using Turndown with customizations:

**Turndown configuration:**
- Heading style: ATX (`#`, `##`, etc.)
- Code block style: Fenced (```)
- Bullet list marker: `-`
- GitHub Flavored Markdown: Enabled (tables, strikethrough, task lists)

**Custom rules:**
- Remove remaining unwanted elements (ads, forms, buttons)
- Strip image alt text and titles (prevents rendering issues)
- Convert bracket `[text]` to parentheses `(text)` (prevents LaTeX interpretation)
- Make all image URLs absolute

### 6. AI Summarization (`src/utils/summarizer.ts`)

When enabled, articles are automatically summarized using Raycast AI.

**Summary generation flow:**

```typescript
Article → buildSummaryPrompt() → Raycast AI → formatSummaryBlock() → Display
                    ↓
            Cache for reuse
```

**Components:**
- **Prompts** (`src/config/prompts.ts`) — Template for each summary style
- **AI Config** (`src/config/ai.ts`) — Model and creativity per style
- **Caching** (`src/utils/summaryCache.ts`) — LocalStorage cache by URL + style
- **Logging** — Tracks generation time, token estimates, success/failure

**Summary styles:**
- Overview — One-liner + 3 bullet points
- Opposing Sides — Two contrasting perspectives
- The 5 Ws — Who, What, Where, When, Why
- Explain Like I'm 5 — Simplified language
- Translated Overview — Summary in another language
- People, Places & Things — Key entities with context
- Arc-style Summary — Detailed, fact-specific summary

Each style has:
- Custom prompt template
- Specific AI model configuration
- Unique creativity level
- Distinctive output format

### 7. View Layer (`src/views/`)

The UI is composed of specialized views for different states:

**ArticleDetailView** (`ArticleDetailView.tsx`)
- Main reading view with article content
- Inline summary display (above article body)
- Streaming summary support with loading states
- Action panel integration

**BlockedPageView** (`BlockedPageView.tsx`)
- Shown when site blocks requests (403 errors)
- Detects browser extension availability
- Provides fallback instructions

**NotReadableView** (`NotReadableView.tsx`)
- Shown when pre-check determines page isn't readable
- Offers option to bypass check and try anyway

**EmptyContentView** (`EmptyContentView.tsx`)
- Shown when extraction succeeds but content is too short
- Handles edge case of valid HTML but no article content

**UrlInputForm** (`UrlInputForm.tsx`)
- Fallback form when no URL found in any source
- Validates input before proceeding

**InactiveTabActions** (`InactiveTabActions.tsx`)
- Special case for browser reimport when tab is inactive
- Prompts user to focus tab before reimporting

## State Management

The extension uses React hooks for state management in `src/open.tsx`:

### Article State
- `article` — Current article data (title, content, metadata)
- `isLoading` — Loading state for initial fetch
- `error` — Error messages from fetch/extraction

### Blocked Page State
- `blockedUrl` — URL that returned 403
- `hasBrowserExtension` — Browser extension availability
- `isWaitingForBrowser` — Waiting for browser fallback
- `foundTab` — Matching browser tab for reimport

### Summary State
- `summaryStyle` — Current summary style (overview, eli5, etc.)
- `summaryPrompt` — Generated prompt for AI
- `cachedSummary` — Previously generated summary from cache
- `completedSummary` — Final summary after streaming completes
- `summaryInitialized` — Whether summary generation has started
- `isSummarizing` — Active summarization in progress

### Form State
- `showUrlForm` — Whether to show URL input form
- `invalidInput` — Invalid URL error message

## Action System (`src/actions/`)

Actions are context-aware and change based on article state:

**ArticleActions** (`ArticleActions.tsx`)
- Copy as Markdown (primary)
- Copy Summary
- Open in Browser
- Copy URL
- Summary style actions (Overview, ELI5, etc.)
- Import from Browser Tab (when available)
- Open Archive Link (when paywall bypassed)

Actions are organized into sections and adapt to:
- AI availability
- Summary cache state
- Archive metadata presence
- Browser extension availability

## Logging System (`src/utils/logger.ts`)

Structured logging using `@chrismessina/raycast-logger` with component-specific loggers:

- **urlLog** — URL resolution events
- **fetchLog** — HTTP fetch operations
- **parseLog** — Content extraction and parsing
- **aiLog** — AI summarization events
- **archiveLog** — Paywall bypass operations

See [logger-integration.md](./logger-integration.md) for detailed logging conventions.

## Data Types (`src/types/`)

### Article (`article.ts`)
```typescript
interface ArticleState {
  url: string;
  title: string;
  byline?: string;
  siteName?: string;
  bodyMarkdown: string;
  textContent: string;
  excerpt?: string;
  archiveSource?: "archive.is" | "archive.org" | "removepaywall";
}
```

### Summary (`summary.ts`)
```typescript
type SummaryStyle =
  | "overview"
  | "opposite-sides"
  | "five-ws"
  | "eli5"
  | "translated"
  | "entities"
  | "arc-style";
```

### Browser (`browser.ts`)
```typescript
interface BrowserTab {
  id: number;
  url: string;
  title?: string;
  active?: boolean;
}
```

## Preferences (`package.json`)

User preferences defined in package.json and accessed via `getPreferenceValues()`:

- **enableAISummary** — Auto-generate summaries (default: true)
- **defaultSummaryStyle** — Default style for summaries (default: overview)
- **translationLanguage** — Language for translated summaries (default: Spanish)
- **showArticleImage** — Display featured image (default: true)
- **enablePaywallHopper** — Try archive services for paywalls (default: true)
- **skipPreCheck** — Skip readability pre-check (default: true)
- **verboseLogging** — Enable debug logging (default: false)

## Error Handling

The extension handles multiple error scenarios gracefully:

| Scenario | Behavior |
|----------|----------|
| No URL found | Show URL input form |
| Invalid URL | Show error with validation message |
| Network failure | "Unable to reach URL" error |
| 403 Forbidden | Show blocked page view with browser fallback |
| 451 Legal | "Unavailable for legal reasons" message |
| Not readable | Show bypass option with warning |
| Empty content | "No content found" with options |
| AI failure | Show content without summary, log error |

All errors are logged appropriately and surfaced to users with actionable next steps.

## Performance Considerations

### Caching
- **Summary cache** — Summaries cached by URL + style in LocalStorage
- **No article cache** — Articles are fetched fresh each time (content may change)

### Image Handling
- Lazy-loaded images resolved during pre-cleaning
- Relative URLs converted to absolute
- Image alt text stripped to prevent rendering issues
- Optional: Hide images via preference

### AI Streaming
- Summaries stream progressively via `useAI` hook
- Partial summaries displayed during generation
- Final summary cached when complete
- Generation time tracked and logged

## Dependencies

### Production
- `@mozilla/readability` — Content extraction
- `turndown` + `turndown-plugin-gfm` — Markdown conversion
- `linkedom` — DOM parsing in Node.js
- `@chrismessina/raycast-logger` — Structured logging
- `@raycast/api` + `@raycast/utils` — Raycast framework

### Development
- `@raycast/eslint-config` — Linting rules
- TypeScript types for all dependencies

## Related Documentation

- [Content Extraction](./content-extraction.md) — Detailed extraction pipeline
- [Configuration](./configuration.md) — AI models and prompts
- [Logger Integration](./logger-integration.md) — Logging conventions
- [Paywall Hopper](./paywall-hopper.md) — Archive service integration
- [Known Issues](./known-issues.md) — Rendering quirks and workarounds
