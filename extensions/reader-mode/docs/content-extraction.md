# Content Extraction Techniques

> This document describes the content extraction improvements implemented in Reader, based on analysis of Safari Reader Mode and Reader View.

## Overview

Reader uses a multi-stage pipeline to extract clean article content from web pages:

1. **HTML Pre-Cleaning** — Remove non-article elements before parsing
2. **Lazy Image Resolution** — Fix lazy-loaded images
3. **Site-Specific Configs** — Handle problematic sites with custom rules
4. **Readability Parsing** — Extract article content using Mozilla Readability
5. **Markdown Conversion** — Convert HTML to Markdown with additional filtering

**Markdown sources skip all five stages** (`src/utils/markdown-source.ts`, called from `loadArticleFromUrl`). A link to a `.md` file (served as Markdown or plain text), or a page that sends Markdown even when asked for HTML, is shown as is. Other Markdown competes with the page's HTML:

- **Where it comes from.** The first fetch sends `Accept: text/markdown` ahead of `text/html` (a site that refuses it with 406 or 415 is asked again for HTML). A page that answers with Markdown (Cloudflare can convert the pages it serves this way, and documentation sites such as Stripe's and Vercel's publish their own) is fetched again as HTML. A page that doesn't, but links a Markdown version with `<link rel="alternate" type="text/markdown" href="…">`, gets that file fetched; if it is missing or isn't Markdown, the page is read as usual. A page that sent Markdown isn't checked for a link: on the sites checked, the two are the same document.
- **Cleaning.** `stripPageChrome` removes what a converter keeps from the page's header and footer, at the start and end of the document only: a skip link, home-page links, a quoted `llms.txt` note, a theme toggle, a "Was this helpful? / YesNo" feedback widget, the page's JSON-LD (only when the page's HTML carries the same JSON), and trailing empty headings. When Readability's article holds at least 75% of the Markdown's text, `trimToArticle` also cuts the Markdown to the lines that article covers, extended through neighboring lines found in it, to whole code blocks, and to images the article shows, keeping reference definitions and front matter. An end is left uncut when what would go holds a line of 100 or more letters of prose: that is article Readability left out (a callout, say), not page chrome.
- **The verdict.** `judgeMarkdown` in `article-loader.ts` passes over the Markdown when it has under 200 characters, says in its prose, not its code, that it is withholding the story ("unlimited access" counts only under 2,000 characters, since a product page says it too), uses more than one MDX component tag (`<Steps>`, `<Card title="…">`, `</Note>`), or holds under 80% of the HTML article's text. When the HTML page is paywalled, the HTML goes first so the Paywall Hopper runs; the Markdown is then shown when it holds 20% more text than the teaser and than any copy the Hopper found. When the HTML can't be fetched or parsed, or the page has over 20,000 elements (too large to parse just for the comparison), the Markdown is shown if it passes the first two checks. The verdict and its reason are logged as `markdown:verdict`, with `from` saying where the Markdown came from.
- **Display.** The title, author, site name, and image come from the page's `<head>`, parsed on its own, except when the page sent Markdown and then failed to parse: that page may be a login or challenge page, so the Markdown's own title is used. Relative links resolve against the Markdown's URL, image alt text is dropped, and bracketed asides become parentheses, as for HTML articles.

**Data payloads** (`src/utils/data-payload.ts`, called from `parseArticle`; the payload and the text the page shows are read before pre-cleaning). Some sites show a teaser behind a subscribe wall but ship the whole article in their framework's data: Nuxt's `<script id="__NUXT_DATA__">` (bizjournals.com) or Next.js's `<script id="__NEXT_DATA__">` (theatlantic.com). A Next.js payload is flattened into Nuxt's indexed form so one walk reads both, and a string in it that holds JSON is also parsed, as a separate root that leaves the string itself in place, because a data cache such as urql keeps its results as text; every string parsed counts against the payload's 5 MB limit, and a payload that flattens to more than 200,000 entries is skipped. The payload is searched for the shape of an article body rather than a known field: a list with at least 3 objects whose `html`, `innerHtml`, `text`, `body`, or `content` string has visible text (entities decoded; script, style, iframe, and noscript contents don't count), holding at least 500 characters, at most 1 MB of markup, and at most 20,000 tags counting each block's wrapper; objects that look like `<head>` tags (`name`, `property`, `rel`…) are skipped. An article stored as one string, not a list of blocks, isn't found. A payload also holds comments and story cards in that shape, so a list is used only if one of its first 3 non-empty blocks opens (first 40 characters) with text the page shows: Readability's article when it found one, otherwise the page's text outside scripts, styles, `[hidden]`, and `<template>` (not `aria-hidden`, which a subscribe modal sets on the whole page behind it). Of those lists, the longest whose built article still has 500 characters wins. It replaces Readability's result when the page fails the readability check, when Readability finds nothing, or when it contains at least half of Readability's text and holds more than 1.5 times as much. When it holds more than 1.5 times what the page shows of it (`recoveredFromPayload`), the loader's soft-paywall check and Paywall Hopper's candidate check weigh only the recovered text, not the page's paywall markup, which describes the teaser.

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

| Event                       | Description                                    |
| --------------------------- | ---------------------------------------------- |
| `clean:schema-detected`     | Schema.org article markup found                |
| `clean:site-config-applied` | Site-specific config applied                   |
| `clean:complete`            | Pre-cleaning finished with stats               |
| `parse:start`               | Readability parsing started                    |
| `parse:precheck`            | isProbablyReaderable result                    |
| `parse:success`             | Article extracted successfully                 |
| `parse:markdown:start`      | Markdown conversion started                    |
| `parse:markdown:success`    | Markdown conversion complete                   |
| `markdown-negotiated:found` | The page sent Markdown when asked              |
| `markdown-alternate:found`  | The page links a Markdown version              |
| `markdown:verdict`          | Markdown or HTML, and why                      |
| `markdown:beats-teaser`     | Paywalled page: Markdown shown over the teaser |

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
