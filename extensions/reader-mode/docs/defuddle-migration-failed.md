# Defuddle Migration Plan

> Migrating from Mozilla Readability + custom quirks to Defuddle for content extraction.

## Overview

This document outlines the migration from our current content extraction stack to [Defuddle](https://github.com/kepano/defuddle),
a more modern library designed for the Obsidian Web Clipper.

### Current Stack

- **@mozilla/readability** - Content extraction
- **linkedom** - DOM parsing for Node.js (required for Raycast compatibility)
- **turndown + turndown-plugin-gfm** - HTML → Markdown conversion
- **quirks.ts** - 42 site-specific configurations
- **html-cleaner.ts** - Pre-cleaning (50+ selectors, link density, lazy images)

### Target Stack

- **defuddle** (core, not node wrapper) - Content extraction + built-in Markdown conversion
- **linkedom** - DOM parsing (keep for Raycast compatibility)

### Why Migrate?

| Feature                | Current             | Defuddle                          |
| ---------------------- | ------------------- | --------------------------------- |
| Dependencies           | 4 packages          | 1-2 packages                      |
| Markdown conversion    | Separate (turndown) | Built-in                          |
| HTML standardization   | Manual              | Automatic (footnotes, math, code) |
| Extractor system       | Custom quirks       | Structured extractors             |
| Schema.org extraction  | Basic               | Comprehensive                     |
| Mobile style awareness | No                  | Yes                               |
| Retry logic            | No                  | Yes (<200 words triggers retry)   |
| Maintenance            | Self-maintained     | Active community                  |

---

## Critical Compatibility Note: linkedom

**Raycast requires linkedom** due to limitations with jsdom in the Raycast environment
(specifically around virtual DOM and relative URL handling).

### Defuddle Compatibility Analysis

Defuddle's `node.ts` wrapper requires jsdom, but the **core Defuddle class** (`defuddle.ts`)
accepts any standard DOM Document object. We can:

1. Import from `defuddle` (not `defuddle/node`)
2. Pass a linkedom document directly to the Defuddle constructor
3. Skip the jsdom-dependent node wrapper entirely

### DOM APIs Used by Defuddle

| API                               | linkedom Support | Notes                             |
| --------------------------------- | ---------------- | --------------------------------- |
| `querySelectorAll()`              | ✅ Full          | Core selector matching            |
| `getElementsByTagName()`          | ✅ Full          | Element collection                |
| `cloneNode()`                     | ✅ Full          | Document duplication              |
| `createElement()`                 | ✅ Full          | Temporary elements                |
| `getAttribute()`/`setAttribute()` | ✅ Full          | Attribute access                  |
| `getComputedStyle()`              | ⚠️ Limited       | Hidden element detection may skip |
| `getBoundingClientRect()`         | ⚠️ Returns zeros | Small image filtering skipped     |
| `styleSheets`                     | ⚠️ Limited       | Mobile style detection may skip   |

**Impact:** Features using limited APIs will degrade gracefully (skip detection)
rather than crash. Content extraction will still work.

---

## Phase 0: Preparation

**Goal**: Establish foundation for safe migration with rollback capability.

### Task 0.1: Linkedom Compatibility Verification ✅

- [x] Analyze Defuddle's DOM API requirements
- [x] Confirm core Defuddle class works with standard Document
- [x] Document limited API behavior

### Task 0.2: Add Feature Flag Preference

Add parser preference to `package.json`:

```json
{
  "name": "contentParser",
  "title": "Content Parser",
  "description": "Choose the content extraction engine.",
  "type": "dropdown",
  "default": "readability",
  "required": false,
  "data": [
    { "title": "Readability (Stable)", "value": "readability" },
    { "title": "Defuddle (Experimental)", "value": "defuddle" }
  ]
}
```

### Task 0.3: Create Test Fixture URLs

Create `docs/test-urls.md` covering:

- News sites (NYTimes, Guardian, BBC, Reuters, CNN)
- Tech sites (Ars Technica, The Verge, Wired, TechCrunch)
- Blog platforms (Medium, Substack, Ghost, WordPress, Blogger)
- Reference sites (Wikipedia, Stack Overflow, GitHub)
- Social content (Reddit, Hacker News)
- Edge cases (paywalls, SPAs, heavy JS)

---

## Phase 1: Core Integration

**Goal**: Create working Defuddle integration alongside existing Readability.

### Task 1.1: Install Defuddle

```bash
npm install defuddle
# Do NOT install jsdom - we're using linkedom
```

### Task 1.2: Create Defuddle Wrapper

Create `src/utils/defuddle-parser.ts`:

```typescript
import { Defuddle } from "defuddle";
import { parseHTML } from "linkedom";
import { parseLog } from "./logger";

export interface DefuddleArticle {
  title: string;
  content: string; // HTML content
  contentMarkdown: string; // Markdown (built-in!)
  textContent: string;
  excerpt: string;
  byline: string | null;
  siteName: string | null;
  length: number;
  // New Defuddle metadata
  published: string | null;
  image: string | null;
  favicon: string | null;
  wordCount: number;
  parseTime: number;
  schemaOrgData: object | null;
}

export function parseWithDefuddle(
  html: string,
  url: string,
  options?: DefuddleOptions,
): { success: true; article: DefuddleArticle } | { success: false; error: DefuddleError } {
  const { document } = parseHTML(html);

  const defuddle = new Defuddle(document, {
    markdown: true,
    removeExactSelectors: options?.removeExactSelectors,
    removePartialSelectors: options?.removePartialSelectors,
    debug: options?.debug,
  });

  const result = defuddle.parse();
  // ... map result to ArticleContent interface
}
```

### Task 1.3: Update Article Loader

Modify `src/utils/article-loader.ts`:

- Import both parsers
- Read `contentParser` preference
- Route to appropriate parser
- Maintain consistent return type

### Task 1.4: Handle Markdown Output

- Use Defuddle's built-in `contentMarkdown`
- Apply Raycast-specific post-processing if needed
- Keep turndown as fallback for Readability path

---

## Phase 2: Testing & Validation

**Goal**: Understand migration gaps through systematic comparison.

### Task 2.1: Side-by-Side Testing

For each test URL, compare:

| Metric               | Readability | Defuddle | Winner |
| -------------------- | ----------- | -------- | ------ |
| Title accuracy       |             |          |        |
| Content completeness |             |          |        |
| Image preservation   |             |          |        |
| Link functionality   |             |          |        |
| Markdown quality     |             |          |        |
| Parse time           |             |          |        |

### Task 2.2: Problem Site Identification

- List sites where Defuddle underperforms
- Categorize issues (missing content, extra clutter, formatting)
- Determine fix approach (selectors, extractors, post-processing)

### Task 2.3: Quirks Audit

Test all 42 quirk sites with Defuddle:

- Which work without any quirks?
- Which need removeSelectors migrated?
- Which need custom extractors?

---

## Phase 3: Quirks → Defuddle Options

**Goal**: Convert site-specific quirks to Defuddle configuration.

### Task 3.1: Migrate removeSelectors

Convert quirks with only `removeSelectors` to Defuddle's `removeExactSelectors`:

**Tier 1 - Simple Migration (19 sites):**

- Medium, Substack, NYTimes, BBC, Washington Post
- TechCrunch, Wired, The Verge, Ars Technica
- Bloomberg, Reuters, Forbes, Atlantic
- Vice, Vox, Polygon, CNN, Axios, Quartz

### Task 3.2: Migrate Common Selectors

Pass `COMMON_REMOVE_SELECTORS` as default options:

- Outbrain/Taboola widgets
- Generic ads, social sharing, comments
- Newsletter signups, video overlays

### Task 3.3: Handle articleSelector Sites

Sites requiring `articleSelector` need one of:

1. **Test first** - Defuddle may extract correctly without it
2. **Pre-extraction** - Extract content before passing to Defuddle
3. **Custom extractor** - Create Defuddle extractor (Phase 4)

**Sites with articleSelector (12 sites):**

- Guardian, Wikipedia, GitHub, Stack Overflow
- Reddit, Apple, Engadget, CNET
- Mashable, BuzzFeed, The Intercept, Hacker News

---

## Phase 4: Custom Extractors

**Goal**: Create extractors only for sites that truly need them.

### Task 4.1: Extractor Pattern

```typescript
interface Extractor {
  name: string;
  domain: string | RegExp;
  extract: (document: Document) => ExtractorResult | null;
}
```

### Task 4.2: Create Required Extractors

Based on Phase 2 results, create extractors for:

- Sites that fail with default Defuddle
- Sites that can't be fixed with removeSelectors
- Sites that required articleSelector

### Task 4.3: Register Extractors

- Create `src/extractors/` directory
- Build extractor registry
- Wire into Defuddle initialization

---

## Phase 5: HTML Cleaner Simplification

**Goal**: Remove redundant pre-processing that Defuddle handles.

### Task 5.1: Feature Audit

| Feature             | Defuddle Handles?          | Action               |
| ------------------- | -------------------------- | -------------------- |
| Negative selectors  | Via removePartialSelectors | Migrate              |
| Protected selectors | Built-in heuristics        | Test & remove        |
| Link density        | Built-in                   | Remove               |
| Lazy images         | Unknown                    | Test, keep if needed |
| Schema.org          | Built-in                   | Remove               |
| Cookie banners      | Via removeSelectors        | Migrate              |
| aria-hidden         | Built-in                   | Remove               |

### Task 5.2: Keep URL Absolutification

`makeUrlsAbsolute()` still needed - linkedom doesn't support base element resolution.

### Task 5.3: Simplify html-cleaner.ts

- Remove features Defuddle handles
- Keep only necessary pre-processing
- Consider deleting if empty

---

## Phase 6: Cleanup

**Goal**: Remove old code and dependencies.

### Task 6.1: Remove Deprecated Code

- Delete `src/utils/readability.ts`
- Delete or archive `src/utils/quirks.ts`
- Simplify or delete `src/utils/html-cleaner.ts`

### Task 6.2: Remove Dependencies

```bash
npm uninstall @mozilla/readability
npm uninstall turndown turndown-plugin-gfm  # if Defuddle markdown sufficient
```

### Task 6.3: Remove Feature Flag

- Remove `contentParser` preference
- Update article-loader to use only Defuddle

### Task 6.4: Update Documentation

- Update README with new architecture
- Update CHANGELOG with migration notes
- Archive this migration plan as completed

---

## Risks and Mitigations

| Risk                         | Impact | Mitigation                               |
| ---------------------------- | ------ | ---------------------------------------- |
| linkedom API gaps            | Medium | Features degrade gracefully              |
| Defuddle extracts less       | High   | Keep Readability fallback via preference |
| Missing site support         | Medium | Create local extractors                  |
| Markdown quality differs     | Medium | Post-process with custom rules           |
| Breaking changes in Defuddle | Low    | Pin version, monitor releases            |

---

## Success Criteria

- [ ] All 42 quirk sites work correctly
- [ ] No regression in extraction quality
- [ ] Markdown output equal or better
- [ ] Parse time equal or faster
- [ ] Fewer dependencies
- [ ] Simpler codebase
- [ ] New metadata available (published, schema.org)

---

## References

- [Defuddle GitHub](https://github.com/kepano/defuddle)
- [Defuddle Extractors](https://github.com/kepano/defuddle/tree/main/src/extractors)
- [linkedom](https://github.com/WebReflection/linkedom)
- [Mozilla Readability](https://github.com/mozilla/readability)
- [Raycast Extension Docs](https://developers.raycast.com)
