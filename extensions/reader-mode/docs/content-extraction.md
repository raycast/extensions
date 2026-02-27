# Content Extraction Techniques

> This document describes the content extraction improvements implemented in Reader, based on analysis of Safari Reader Mode and Reader View.

## Overview

Reader uses a multi-stage pipeline to extract clean article content from web pages:

1. **HTML Pre-Cleaning** — Remove non-article elements before parsing
2. **Lazy Image Resolution** — Fix lazy-loaded images
3. **Site-Specific Configs** — Handle problematic sites with custom rules
4. **Readability Parsing** — Extract article content using Mozilla Readability
5. **Markdown Conversion** — Convert HTML to Markdown with additional filtering

---

## Sources of Inspiration

These techniques are based on analysis of two mature reader mode implementations:

### Safari Reader Mode

- **Source**: [ReaderArticleFinder.js](https://github.com/dm-zharov/safari-readability/blob/main/ReaderArticleFinder.js)
- **Key techniques**: Score-based content detection, schema.org detection, site quirks list, lazy image handling

### Reader View (Browser Extension)

- **Source**: [index.js](https://github.com/rNeomy/reader-view/blob/master/v3/data/reader/index.js)
- **Key techniques**: Turndown integration, multiple article detection, design mode

---

## Implementation Details

### 1. HTML Pre-Cleaning (`src/utils/html-cleaner.ts`)

The `preCleanHtml()` function removes non-article elements before Readability runs. This improves extraction accuracy by eliminating noise.

#### Negative Selectors (Elements Removed)

| Category            | Selectors                                                                     |
| ------------------- | ----------------------------------------------------------------------------- |
| **Sidebars**        | `[class*="sidebar"]`, `[id*="sidebar"]`                                       |
| **Comments**        | `[class*="comment"]`, `#disqus_thread`                                        |
| **Subscriptions**   | `[class*="subscribe"]`, `[class*="newsletter"]`, `[aria-label*="newsletter"]` |
| **Advertisements**  | `[class*="advertisement"]`, `[class*="ad-container"]`, `[data-ad]`            |
| **Social/Sharing**  | `[class*="social"]`, `[class*="share"]`                                       |
| **Related Content** | `[class*="related"]`, `[class*="promo"]`                                      |
| **Navigation**      | `nav`, `[role="navigation"]`, `[class*="breadcrumb"]`                         |
| **Complementary**   | `[role="complementary"]`                                                      |
| **Footer**          | `[class*="footer"]`                                                           |
| **Widgets**         | `[class*="widget"]`, `[class*="toolbar"]`                                     |
| **Carousels**       | `[class*="carousel"]`, `[class*="swiper"]`, `[class*="slider"]`               |

#### Protected Selectors (Never Removed)

These elements are protected from removal even if they match negative patterns:

- `article`
- `main`, `[role="main"]`
- `[itemprop="articleBody"]`
- `[itemtype*="schema.org/Article"]`
- `.post-content`, `.article-content`, `.entry-content`

#### Schema.org Detection

The cleaner detects schema.org article markup:

- `[itemprop="articleBody"]`
- `[itemtype*="schema.org/Article"]`
- `[itemtype*="schema.org/NewsArticle"]`

When detected, this is logged and can be used for enhanced extraction.

---

### 2. Lazy-Loaded Image Resolution

Many sites use lazy loading for images, which can result in placeholder images in the extracted content. The cleaner resolves these by checking common lazy-load attributes:

| Attribute          | Priority |
| ------------------ | -------- |
| `data-src`         | 1        |
| `data-lazy-src`    | 2        |
| `data-original`    | 3        |
| `datasrc`          | 4        |
| `original-src`     | 5        |
| `data-srcset`      | 6        |
| `data-lazy-srcset` | 7        |
| `data-hi-res-src`  | 8        |
| `data-native-src`  | 9        |

Images with placeholder `src` values (data URIs, "placeholder", "transparent", "blank") have their `src` replaced with the lazy-loaded URL.

---

### 3. Site-Specific Configs (`src/config/site-config.ts`)

Some sites have non-standard HTML structures that require custom handling. The site config system provides:

- **Custom article selectors** — Override default content detection
- **Additional remove selectors** — Site-specific elements to remove
- **Text pattern removal** — Remove elements by text content
- **Inline selectors** — Convert block elements to inline for better markdown
- **Caption formatting** — Format image captions with italic text and separated credits
- **Schema.org preference** — Prefer schema.org markup when available

#### Supported Sites

| Site            | Config Applied                                       |
| --------------- | ---------------------------------------------------- |
| Wikipedia       | Remove edit sections, navboxes, infoboxes, TOC       |
| Medium          | Remove share buttons, audio players, response counts |
| Substack        | Remove subscribe widgets, comments                   |
| NYTimes         | Remove share tools, inline messages                  |
| The Guardian    | Remove contributions epic, ad slots                  |
| BBC             | Remove related topics, promo links                   |
| Washington Post | Remove print-hidden elements, subscribe promos       |
| Ars Technica    | Remove sidebar, related stories                      |
| The Verge       | Remove ad wrappers, recirculation                    |
| Wired           | Remove newsletter forms, related content             |
| TechCrunch      | Remove newsletter embeds, related posts              |
| GitHub          | Remove octicons, anchors                             |
| Stack Overflow  | Remove vote counts, post menus                       |
| Reddit          | Remove vote arrows, promoted links                   |
| Vanity Fair     | Caption formatting (italic text, separated credits)  |
| And more...     | See `site-config.ts` for full list                   |

#### Adding New Site Configs

To add a config for a new site, add an entry to the `SITE_CONFIGS` array in `site-config.ts`:

```typescript
[
  /^(.*\.)?example\.com$/i,
  {
    name: "Example",
    articleSelector: ".article-body",
    removeSelectors: [
      ".sidebar",
      ".newsletter-signup",
    ],
  },
],
```

#### Caption Formatting

For sites with structured image captions (like Condé Nast publications), use `captionConfig`:

```typescript
{
  name: "Vanity Fair",
  articleSelector: "article",
  captionConfig: {
    textSelector: ".caption__text",    // Wrapped in <em> for italic
    creditSelector: ".caption__credit", // Prepended with space
  },
},
```

This produces captions like: _Caption text._ Photo Credit.

---

### 4. Turndown Element Removal (`src/utils/markdown.ts`)

After Readability extraction, Turndown converts HTML to Markdown. Additional elements are removed at this stage:

- `script`, `style`, `noscript`
- `iframe`, `form`
- `button`, `input`, `select`, `textarea`
- `aside`, `nav`
- Elements with `role="complementary"` or `role="navigation"`

---

### 5. Integration Flow

```text
┌─────────────────────────────────────────────────────────────────┐
│                        Input HTML                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  1. makeUrlsAbsolute()                                          │
│     Convert relative URLs to absolute                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. preCleanHtml()                                              │
│     - Apply site configs                                        │
│     - Remove negative elements                                  │
│     - Resolve lazy-loaded images                                │
│     - Detect schema.org markup                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. Readability.parse()                                         │
│     Extract article content                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. htmlToMarkdown()                                            │
│     - Remove remaining unwanted elements                        │
│     - Convert to Markdown                                       │
│     - Post-process image syntax                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Clean Markdown                              │
└─────────────────────────────────────────────────────────────────┘
```

---

## Logging

The content extraction pipeline logs key events for debugging:

| Event                       | Description                      |
| --------------------------- | -------------------------------- |
| `clean:schema-detected`     | Schema.org article markup found  |
| `clean:site-config-applied` | Site-specific config applied     |
| `clean:complete`            | Pre-cleaning finished with stats |
| `parse:start`               | Readability parsing started      |
| `parse:precheck`            | isProbablyReaderable result      |
| `parse:success`             | Article extracted successfully   |
| `parse:markdown:start`      | Markdown conversion started      |
| `parse:markdown:success`    | Markdown conversion complete     |

Enable verbose logging in preferences to see these events.

---

## Future Improvements

Potential enhancements based on Safari Reader techniques not yet implemented:

1. **Score-based candidate selection** — Safari uses a sophisticated scoring algorithm to rank content candidates
2. **Density-based filtering** — Remove low-density sections (high link-to-text ratio)
3. **Header element detection** — Better title extraction using DOM distance calculations
4. **CJK language handling** — Score multipliers for Chinese/Japanese/Korean content
5. **Embedded media preservation** — Better handling of tweets, videos, etc.

---

## References

- [Mozilla Readability](https://github.com/mozilla/readability)
- [Safari Readability (dm-zharov)](https://github.com/dm-zharov/safari-readability)
- [Reader View Extension (rNeomy)](https://github.com/rNeomy/reader-view)
- [Turndown](https://github.com/mixmark-io/turndown)
