# Reader Mode

<div align="center">
  <a href="https://github.com/chrismessina">
    <img src="https://img.shields.io/github/followers/chrismessina?label=Follow%20chrismessina&style=social" alt="Follow @chrismessina">
  </a>
  <a href="https://github.com/chrismessina/raycast-reader/stargazers">
    <img src="https://img.shields.io/github/stars/chrismessina/raycast-reader?style=social" alt="Stars">
  </a>
  <a href="https://www.raycast.com/chrismessina/reader-mode">
    <img src="https://img.shields.io/badge/Raycast-Store-red.svg" alt="Reader Mode on Raycast store.">
  </a>
</div>

Read the web distraction-free in Raycast.

## Features

- **Clean Reading Experience** - Extracts article content and removes distractions
- **AI Summaries** - Multiple summary styles powered by Raycast AI
- **Browser Extension Fallback** - Access blocked pages and re-import member-only content via the Raycast browser extension
- **Smart URL Detection** - Automatically detects URLs from arguments, clipboard, selection, or active browser tab

## Commands

| Command                             | Description                                  | Default  |
| ----------------------------------- | -------------------------------------------- | -------- |
| **Open in Reader Mode**             | Main command - opens a URL in reader mode    | Enabled  |
| **Open Clipboard in Reader Mode**   | Opens URL from clipboard directly            | Disabled |
| **Open Current Tab in Reader Mode** | Opens the current browser tab in reader mode | Disabled |

The clipboard and current tab commands are disabled by default to reduce command clutter. Enable them in Raycast Settings → Extensions → Reader Mode if you prefer dedicated commands over the main command's auto-detection.

## Architecture

### Content Extraction

Reader Mode uses a multi-layered approach to extract clean article content:

1. **Site-Specific Extractors** (`src/extractors/`) - Custom extraction logic for complex sites
2. **Site Configuration** (`src/utils/site-config.ts`) - Selector-based configuration for simpler sites
3. **Mozilla Readability** - Fallback for all other sites

#### Extractors vs Site Config

| Approach        | Use Case                                                      | Examples                     |
| --------------- | ------------------------------------------------------------- | ---------------------------- |
| **Extractors**  | Sites needing custom DOM traversal and content transformation | Hacker News, GitHub, Reddit  |
| **Site Config** | Sites needing only CSS selector adjustments                   | Medium, Substack, news sites |
| **Readability** | Standard article pages                                        | Most blogs and news articles |

### Adding Support for New Sites

**For simple sites** (just need different selectors), add to `src/utils/site-config.ts`:

```typescript
[
  /^example\.com$/i,
  {
    name: "Example",
    articleSelector: ".article-body",
    removeSelectors: [".ads", ".sidebar"],
  },
],
```

**For complex sites** (need custom extraction logic), create a new extractor:

1. Create `src/extractors/mysite.ts` extending `BaseExtractor`
2. Implement `canExtract()`, `extract()`, and `get siteName()`
3. Register in `src/extractors/index.ts`

```typescript
export class MySiteExtractor extends BaseExtractor {
  get siteName(): string {
    return "My Site";
  }

  canExtract(): boolean {
    return !!this.querySelector(".my-content");
  }

  extract(): ExtractorResult {
    // Custom extraction logic
    return { content, textContent, metadata };
  }
}
```

## Summary Configuration

The extension uses a modular configuration system located in `src/config/`:

### AI Model Configuration (`ai.ts`)

Controls which AI model and creativity level is used for each summary style. This allows fine-tuning performance per summary type.

```typescript
export const AI_SUMMARY_CONFIG: Record<SummaryStyle, AIStyleConfig> = {
  overview: { model: AI.Model["OpenAI_GPT-5_nano"], creativity: "low" },
  "opposite-sides": { model: AI.Model["OpenAI_GPT-5_nano"], creativity: "low" },
  // ...
};
```

### Prompt Templates (`prompts.ts`)

Contains all summary prompt templates in one place for easy comparison and editing.

```typescript
export const SUMMARY_PROMPTS: Record<SummaryStyle, PromptConfig> = {
  overview: {
    label: "Overview",
    buildPrompt: (context) => `${context}\n\nSummarize this article...`,
  },
  // ...
};
```

Each prompt config includes:

- **`label`** - Human-readable name shown in the UI
- **`buildPrompt`** - Function that generates the full prompt from article context

### Summary Styles

| Style                       | Description                                           |
| --------------------------- | ----------------------------------------------------- |
| **Overview**                | One-liner summary + 3 key bullet points               |
| **At a Glance**             | Summary + Key Takeaways in a concise format           |
| **Comprehensive**           | Fact-filled bullet points from the author's POV       |
| **Opposing Sides**          | Two contrasting viewpoints from the article           |
| **The 5 Ws**                | Who, What, Where, When, Why breakdown                 |
| **Explain Like I'm 5**      | Simplified explanation using simple language          |
| **People, Places & Things** | Key entities extracted with context                   |

### Summary Output Language

All summary styles can be generated in your preferred language. Set the **Summary Output Language** preference to choose from 21 supported languages including English (default), Spanish, French, German, Japanese, Chinese, and more. When a non-English language is selected, summaries will be generated in that language regardless of the article's original language.

## Browser Extension Integration

Reader Mode integrates with the [Raycast browser extension](https://www.raycast.com/browser-extension) to handle blocked pages and access authenticated content.

### Handling Blocked Pages

Some websites (like Politico, Bloomberg, etc.) use bot detection that prevents direct content fetching. When this happens, Reader Mode automatically offers a browser extension fallback:

**How It Works:**

1. **Detection** - When a 403 "Access Denied" error occurs, Reader Mode checks if you have the Raycast browser extension installed
2. **Instructions** - Shows a friendly message with clear steps to access the content
3. **Browser Fallback** - You can open the page in your browser and fetch content via the extension

**Usage:**

1. Press **Enter** to open the URL in your browser
2. Wait for the page to fully load
3. Press **⌘ + R** to fetch the content via the Raycast browser extension
4. The article loads normally with full content

### Re-importing Member-Only Content

For paywalled or member-only articles (like Medium member stories), you can re-import content from an authenticated browser session:

**When to Use:**

- Medium member-only articles
- Paywalled content from news sites
- Any article requiring authentication to view full content

**How It Works:**

1. Open the article in Reader Mode (you'll see a truncated or blocked version)
2. Press **⌘ + ⇧ + R** to trigger "Import from Browser Tab"
3. Reader Mode finds the matching browser tab using the article's canonical URL
4. If the tab is inactive, you'll be prompted to focus it first
5. Content is re-imported with your authenticated session, showing the full article

**Requirements:**

- [Raycast browser extension](https://www.raycast.com/browser-extension) must be installed
- The article must be open in a browser tab
- You must be logged in to the site in your browser
- The browser tab must be active (focused) when importing

### Inspiration: Defuddle

This extension's content extraction architecture was inspired by [Defuddle](https://github.com/kepano/defuddle), a content extraction library by [@kepano](https://github.com/kepano). We initially attempted to use Defuddle directly, but found it wasn't well-suited for Raycast's environment:

- **DOM Environment**: Defuddle expects a browser DOM, while Raycast extensions run in Node.js with `linkedom`
- **Bundle Size**: Defuddle's full feature set added unnecessary weight for our use case
- **Output Format**: We needed tighter integration with our metadata extraction and markdown conversion pipeline

Instead, we adopted Defuddle's excellent patterns:

- **Site-specific extractors** with a clean base class architecture
- **Schema.org JSON-LD parsing** for rich metadata extraction
- **Fallback chains** for metadata (Schema.org → Open Graph → Twitter Cards → meta tags)
- **Comprehensive cleanup selectors** for removing ads, navigation, and other distractions

This hybrid approach gives us the best of both worlds: Defuddle's battle-tested extraction patterns with tight Raycast integration.

## Known Issues

### Bracket Rendering

Square brackets `[text]` that appear in article content (such as editorial insertions in quotes) are automatically converted to parentheses `(text)` to prevent Raycast's markdown renderer from interpreting them as LaTeX math notation. This is a workaround for a rendering limitation and means the displayed text may differ slightly from the original source material.

### Image Rendering

Image alt text and title attributes are automatically stripped to ensure proper rendering in Raycast. Images are displayed as `![](url)` without descriptive text. This prevents rendering issues where long alt text or title attributes (especially those containing quotes) can break the markdown image syntax.

Additionally, relative image URLs (e.g., `/image.jpg`) are automatically converted to absolute URLs using the page's base URL to ensure images load properly.

## References

- [Mozilla Readability](https://github.com/mozilla/readability) - Core content extraction
- [Defuddle](https://github.com/kepano/defuddle) - Inspiration for extractor architecture
- [Turndown](https://github.com/mixmark-io/turndown) - HTML to Markdown conversion
- [Raycast API Docs](https://developers.raycast.com)
- [Logger Integration Guide](./docs/logger-integration.md)
- [Extension Spec](./docs/about.md)
