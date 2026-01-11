# Contributing to Reader

Thank you for your interest in contributing to Reader! This guide will help you understand the codebase and make effective contributions.

## Table of Contents

- [Getting Started](#getting-started)
- [Architecture Overview](#architecture-overview)
- [Content Extraction](#content-extraction)
- [Adding Site Support](#adding-site-support)
- [Working with Summaries](#working-with-summaries)
- [Development Workflow](#development-workflow)
- [Testing](#testing)
- [Code Style](#code-style)
- [Submitting Changes](#submitting-changes)

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Raycast installed on macOS or Windows
- Basic understanding of React and TypeScript

### Setup

1. Clone the repository:
```bash
git clone https://github.com/chrismessina/raycast-reader.git
cd raycast-reader
```

2. Install dependencies:
```bash
npm install
```

3. Start development mode:
```bash
npm run dev
```

4. The extension will automatically reload in Raycast when you make changes.

### Project Structure

```
raycast-reader/
├── src/
│   ├── actions/          # Action panel components
│   ├── config/           # AI and prompt configuration
│   ├── extractors/       # Site-specific extractors
│   ├── types/            # TypeScript type definitions
│   ├── utils/            # Utility functions
│   ├── views/            # React view components
│   └── open.tsx          # Main command entry point
├── docs/                 # Documentation
│   ├── architecture.md   # System architecture
│   ├── configuration.md  # AI/prompt configuration
│   ├── content-extraction.md  # Extraction pipeline
│   └── ...
└── package.json          # Extension manifest and preferences
```

## Architecture Overview

Reader follows a pipeline architecture:

```
URL Input → Fetch → Extract → Convert → Summarize → Display
```

See [docs/architecture.md](./docs/architecture.md) for detailed architecture documentation.

### Key Components

- **URL Resolution** (`src/utils/url-resolver.ts`) — Multi-source URL detection
- **Article Loading** (`src/utils/article-loader.ts`) — Fetch and orchestration
- **Content Extraction** (see below) — Multi-layered extraction system
- **Markdown Conversion** (`src/utils/markdown.ts`) — HTML to Markdown
- **AI Summarization** (`src/utils/summarizer.ts`) — Summary generation
- **View Layer** (`src/views/`) — React components for different states

## Content Extraction

Reader uses a **three-tier extraction system** that handles different site complexities:

### 1. Site-Specific Extractors (`src/extractors/`)

**Use when:** Site requires completely custom logic that bypasses Readability entirely.

Extractors are for sites with non-standard structures that need custom DOM traversal and content transformation.

**Current extractors:**
- `hackernews.ts` — Transforms comment threads
- `github.ts` — Extracts README content
- `reddit.ts` — Converts posts and comments
- `medium.ts` — Handles Medium's custom structure

**Creating an extractor:**

```typescript
// src/extractors/mysite.ts
import { BaseExtractor, ExtractorResult } from "./_base";

export class MySiteExtractor extends BaseExtractor {
  get siteName(): string {
    return "My Site";
  }

  canExtract(): boolean {
    // Return true if this extractor should handle the current URL
    return !!this.querySelector(".my-site-content");
  }

  extract(): ExtractorResult {
    // Custom extraction logic
    const content = this.querySelector(".article");
    const title = this.querySelector("h1")?.textContent || "";

    return {
      content: content?.innerHTML || "",
      textContent: content?.textContent || "",
      metadata: {
        title,
        siteName: this.siteName,
      },
    };
  }
}
```

Then register it in `src/extractors/index.ts`:

```typescript
import { MySiteExtractor } from "./mysite";

export function getExtractorForUrl(url: string, document: Document) {
  const extractors = [
    new MySiteExtractor(url, document),
    new HackerNewsExtractor(url, document),
    // ... other extractors
  ];

  return extractors.find(e => e.canExtract()) || null;
}
```

### 2. Site Configuration (`src/utils/site-config.ts`)

**Use when:** Site just needs CSS selector adjustments (works WITH Readability).

Site configs pre-clean HTML before Readability runs. This is simpler and less error-prone than full extractors.

**Adding site config:**

```typescript
// In src/utils/site-config.ts
export const SITE_CONFIGS: [RegExp, SiteConfig][] = [
  [
    /^(.*\.)?example\.com$/i,
    {
      name: "Example",
      articleSelector: ".article-body",
      removeSelectors: [
        ".sidebar",
        ".newsletter-signup",
        ".social-share",
      ],
    },
  ],
  // ... other configs
];
```

**Available options:**
- `name` — Human-readable site name
- `articleSelector` — Override content container selector
- `removeSelectors` — Array of selectors to remove before extraction
- `preferSchema` — Prefer schema.org markup (default: false)

### 3. Mozilla Readability (Fallback)

Automatically handles standard article pages without any configuration.

### Decision Tree: Extractor vs Site Config

```
Does the site need custom DOM traversal or content restructuring?
├─ YES → Create an extractor
└─ NO → Use site config
    ├─ Need to remove specific elements?
    │  └─ Add removeSelectors to site config
    ├─ Need custom article container?
    │  └─ Add articleSelector to site config
    └─ Standard article page?
       └─ No config needed (Readability handles it)
```

## Adding Site Support

### For Simple Sites (Recommended)

1. **Identify the problem:**
   - Test the site in Reader
   - Note unwanted content (ads, sidebars, etc.)
   - Use browser DevTools to find CSS selectors

2. **Add site config:**

```typescript
[
  /^(.*\.)?example\.com$/i,
  {
    name: "Example Site",
    removeSelectors: [
      ".advertisement",
      ".sidebar",
      "[data-component='newsletter']",
    ],
  },
],
```

1. **Test:**
   - Reload extension in Raycast (you may need to `Clear Local Storage & Cache`)
   - Test multiple articles from the site
   - Verify unwanted content is removed

### For Complex Sites

Only create an extractor if site config doesn't work.

1. **Create extractor file:** `src/extractors/mysite.ts`
2. **Extend BaseExtractor** and implement required methods
3. **Register in** `src/extractors/index.ts`
4. **Test thoroughly** — extractors bypass Readability, so they must handle all extraction themselves

See [docs/content-extraction.md](./docs/content-extraction.md) for detailed extraction pipeline documentation.

## Working with Summaries

### Understanding the Summary System

Summaries are configured in two files:

- **`src/config/prompts.ts`** — Prompt templates for each style
- **`src/config/ai.ts`** — AI model and creativity settings

See [docs/configuration.md](./docs/configuration.md) for comprehensive configuration documentation.

### Adding a New Summary Style

1. **Add type** to `src/types/summary.ts`:

```typescript
export type SummaryStyle =
  | "overview"
  | "my-new-style"  // Add here
  | ...;
```

2. **Configure AI settings** in `src/config/ai.ts`:

```typescript
export const AI_SUMMARY_CONFIG: Record<SummaryStyle, AIStyleConfig> = {
  "my-new-style": {
    model: AI.Model["OpenAI_GPT-5_nano"],
    creativity: "low",
  },
  // ...
};
```

3. **Add prompt template** in `src/config/prompts.ts`:

```typescript
export const SUMMARY_PROMPTS: Record<SummaryStyle, PromptConfig> = {
  "my-new-style": {
    label: "My New Style",
    buildPrompt: (context) => `${context}

Your instructions here...

Format your response EXACTLY like this:
[expected format]`,
  },
  // ...
};
```

4. **Add preference option** in `package.json`:

```json
{
  "name": "defaultSummaryStyle",
  "data": [
    { "title": "My New Style", "value": "my-new-style" },
    ...
  ]
}
```

5. **Add action** in `src/actions/ArticleActions.tsx`:

```typescript
<Action
  title="My New Style"
  icon={Icon.Stars}
  shortcut={{ modifiers: ["cmd", "shift"], key: "n" }}
  onAction={() => onSummarize("my-new-style")}
/>
```

### Modifying Existing Prompts

Edit the prompt template in `src/config/prompts.ts`:

```typescript
overview: {
  label: "Overview",
  buildPrompt: (context) => `${context}

Your modified instructions...`,
}
```

Clear cached summaries to test changes:

```typescript
localStorage.removeItem('summary:URL:style:default');
```

## Development Workflow

### Running the Extension

```bash
# Development mode (auto-reload)
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

### Debugging

1. **Enable verbose logging:**
   - Open Reader preferences in Raycast
   - Enable "Debug Logging"
   - Logs appear in the terminal where you run the development command

2. **View logs:**

```bash
# macOS
log stream --predicate 'subsystem == "com.raycast.macos"' --level debug

# Or use Console.app and filter for "Reader"
```

3. **Common log events:**

   - `url:resolve:*` — URL resolution
   - `fetch:*` — HTTP requests
   - `parse:*` — Content extraction
   - `ai:*` — Summary generation

### Common Development Tasks

**Test a specific URL:**

```bash
# In Raycast, run: reader https://example.com/article
```

**Clear summary cache:**

```typescript
// In extension code or browser console
Object.keys(localStorage)
  .filter(key => key.startsWith('summary:'))
  .forEach(key => localStorage.removeItem(key));
```

**Test extraction without summaries:**

- Disable "Automatically Generate Summaries" in preferences
- Or set `enableAISummary: false` temporarily

## Testing

### Manual Testing

1. **Test different scenarios:**
   - Direct URLs
   - Clipboard detection
   - Browser extension fallback
   - Blocked pages (403)
   - Paywalled content
   - Non-readable pages

2. **Test summary styles:**
   - Generate each style on the same article
   - Verify formatting matches expected output
   - Check generation time (logged)

### Testing Site Configs

Before submitting a site config:

1. Test on at least 3 different articles from the site
2. Verify all selectors work across different article types
3. Check that no article content is accidentally removed
4. Test on both modern and older articles (HTML may differ)

### Testing Extractors

Before submitting an extractor:

1. Test on at least 5-10 different URLs from the site
2. Verify all metadata is extracted correctly
3. Check edge cases (short content, missing fields, etc.)
4. Compare output to Readability fallback (if applicable)
5. Ensure `canExtract()` accurately identifies when to activate

## Code Style

### TypeScript

- Use TypeScript for all new code
- Define types for all function parameters and return values
- Avoid `any` — use proper types or `unknown`
- Use interfaces for object shapes, types for unions

### React

- Use functional components with hooks
- Extract complex logic into custom hooks or utilities
- Keep components focused on rendering
- Use descriptive component and prop names

### Naming Conventions

- **Files:** `kebab-case.ts`
- **Components:** `PascalCase.tsx`
- **Functions:** `camelCase()`
- **Constants:** `SCREAMING_SNAKE_CASE`
- **Types/Interfaces:** `PascalCase`

### Code Organization

- Keep files under 300 lines
- Extract reusable logic into `src/utils/`
- Group related functions together
- Add JSDoc comments for public APIs

### Logging

Use the structured logging system:

```typescript
import { parseLog } from "./utils/logger";

parseLog("parse:start", { url, selector });
parseLog("parse:success", { title, contentLength: content.length });
parseLog("parse:error", { error: err.message });
```

**Log levels:**

- `verbose` — Detailed debugging info (requires preference enabled)
- `info` — Normal operation events
- `warn` — Unexpected but handled situations
- `error` — Failures and exceptions

See [docs/logger-integration.md](./docs/logger-integration.md) for logging conventions.

## Submitting Changes

### Before Submitting

- [ ] Code follows style guidelines
- [ ] Changes tested manually
- [ ] Logs added for new operations
- [ ] Documentation updated if needed
- [ ] No console.log statements left in code
- [ ] TypeScript compiles without errors
- [ ] Linter passes (`npm run lint`)

### Pull Request Process

1. **Create a descriptive PR title:**
   - ✅ "Add site config for TechCrunch"
   - ✅ "Fix lazy image resolution for Substack"
   - ❌ "Update code"

2. **Describe your changes:**
   - What problem does this solve?
   - How did you test it?
   - Any edge cases to be aware of?

3. **Include test URLs:**
   - Provide sample URLs that demonstrate the fix/feature
   - Describe what should happen

4. **Keep PRs focused:**
   - One feature or fix per PR
   - Don't mix unrelated changes

### Commit Messages

Follow conventional commits format:

```bash
feat: Add GitHub extractor
fix: Resolve lazy images in Medium articles
docs: Update configuration guide
refactor: Simplify URL resolution logic
```

## Questions?

- **Architecture:** See [docs/architecture.md](./docs/architecture.md)
- **Configuration:** See [docs/configuration.md](./docs/configuration.md)
- **Content Extraction:** See [docs/content-extraction.md](./docs/content-extraction.md)
- **Issues:** Open an issue on GitHub

Thank you for contributing to Reader!
