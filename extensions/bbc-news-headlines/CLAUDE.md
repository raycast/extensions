# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Run in Raycast development mode (hot reload)
npm run build      # Build the extension
npm run lint       # Run ESLint via Raycast CLI
npm run fix-lint   # Auto-fix lint issues
npm run publish    # Publish to Raycast Store
```

There is no test suite for this project.

## Architecture

This is a [Raycast](https://raycast.com) extension with a single command (`src/bbc-news.tsx`) that:

1. Fetches the BBC News RSS feed (`http://feeds.bbci.co.uk/news/rss.xml`) using `rss-parser`
2. Caches the result using `useCachedPromise` from `@raycast/utils` to avoid refetching on every open
3. Renders headlines in a searchable `List` with pub date as an accessory
4. Provides two actions per item: open in browser, copy link

The entry point is declared in `package.json` under `commands[0].name: "bbc-news"`, which maps to `src/bbc-news.tsx`.

### Key dependencies

- `@raycast/api` — UI primitives (`List`, `Action`, `ActionPanel`) and Raycast integrations
- `@raycast/utils` — `useCachedPromise` for data fetching with caching
- `rss-parser` — parses the BBC RSS feed XML into JS objects

### Raycast-specific conventions

- All UI must use `@raycast/api` components — no DOM, no HTML
- Commands export a default React component
- The `ray` CLI (from `@raycast/api`) handles building, linting, and development server
- Linting extends `@raycast/eslint-config`; Prettier config is in `.prettierrc`
