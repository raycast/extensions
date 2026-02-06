# Agent Guidelines for Reader

> Instructions for AI coding assistants working on this codebase.

## Before Making Changes

**Always read the relevant documentation first:**

- `docs/content-extraction.md` — Explains the extraction pipeline architecture
- `docs/logger-integration.md` — Logging conventions
- Existing code in the area you're modifying

## Content Extraction: Site Config vs Extractors

This is the most common source of mistakes. There are **two different mechanisms** for handling site-specific content:

### 1. Site Config (`src/utils/site-config.ts`)

**Use for:** Simple element removal, custom article selectors

Site configs work **with** Readability — they pre-clean the HTML before Readability extracts content.

```typescript
// Example: Remove "View Bio" buttons from TechCrunch
[
  /^(.*\.)?techcrunch\.com$/i,
  {
    name: "TechCrunch",
    articleSelector: ".entry-content",
    removeSelectors: [
      ".embed-tc-newsletter",
      '[data-ctatext="View Bio"]',  // ← Just add selectors here
    ],
  },
],
```

### 2. Extractors (`src/extractors/`)

**Use for:** Sites that need completely custom extraction logic (replacing Readability entirely)

Extractors **bypass** Readability and handle all content extraction themselves. Only use when:

- The site structure is incompatible with Readability (e.g., Hacker News comments)
- You need to transform/restructure content (e.g., GitHub READMEs)
- Standard extraction produces fundamentally wrong results

**Current extractors:** HackerNews, GitHub, Reddit, Medium

### Decision Tree

```text
Need to remove elements from a site?
  └─→ Add selectors to site-config.ts

Need custom article container selector?
  └─→ Add articleSelector to site-config.ts

Need to completely restructure content?
  └─→ Create an extractor (rare)
```

## Common Mistakes to Avoid

1. **Creating an extractor when site config would suffice**
   - Extractors override Readability entirely
   - If your extractor's `extract()` returns empty/wrong content, the article breaks
   - Site config just removes elements, letting Readability do the heavy lifting

2. **Not testing after changes**
   - Always verify the article still extracts correctly after adding selectors

3. **Adding overly broad selectors**
   - Be specific with selectors to avoid removing article content
   - Prefer attribute selectors like `[data-ctatext="View Bio"]` over class patterns

## File Structure

```text
src/
├── extractors/          # Full custom extractors (bypass Readability)
│   ├── _base.ts         # Base class for extractors
│   ├── index.ts         # Extractor registry
│   ├── hackernews.ts    # HN-specific extraction
│   └── ...
├── utils/
│   ├── site-config.ts   # Site-specific selectors (works WITH Readability)
│   ├── html-cleaner.ts  # Pre-cleaning logic using site configs
│   ├── readability.ts   # Main extraction pipeline
│   └── ...
```

## Testing

Test extraction with the Raycast extension on real URLs before considering work complete.

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: `npx openskills read <skill-name>` (run in your shell)
  - For multiple: `npx openskills read skill-one,skill-two`
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>raycast-extension-updater</name>
<description>Update a Raycast extension to the latest version</description>
<location>global</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>
