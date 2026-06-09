# AGENTS.md

## Scope

This folder contains shared logic for the Raycast commands.

## Responsibilities

- `cache.ts`: Raycast cache storage and cache freshness checks (24-hour TTL).
- `errors.ts`: Human-readable error extraction.
- `fmhy-api.ts`: FMHY single-page fetch and index construction.
- `fmhy-url.ts`: FMHY route aliases, Reddit wiki redirect conversion, generated category URL normalization, and FMHY anchor slug helpers.
- `format.ts`: Display formatting helpers.
- `parser.ts`: Markdown link parsing and result normalization (most complex; owns heading/category/category-note/related-link extraction).
- `search.ts`: Token-based search keyword filtering.
- `types.ts`: Shared TypeScript interfaces.

## Key Patterns

### Parsing (parser.ts)

- **Line-by-line processing**: Maintains heading hierarchy (last 2 levels = category).
- **Page-route tracking**: Level-1 headings update FMHY page context through `getFmhyPageRouteForTopLevelHeading()`.
- **Link extraction**: Parses `[text](url)` markdown with nested parentheses handling.
- **Deduplication**: Maps by `hostname + pathname + search + hash` (case-insensitive). Prefers: https > http, starred > unstarred, with description > without.
- **Category metadata**: Emits `FmhyCategory` entries with normalized category URLs and note lines.
- **Related links**: Extracts secondary links from descriptions and attachment rows. Classifies link kinds for Discord, GitHub, GitLab, Reddit, Telegram, X/Twitter, FMHY, source, and generic websites.
- **Text cleaning**: Decode HTML entities → remove control chars → strip markdown formatting (bold/italic/backticks) → remove emojis → normalize whitespace.
- **Generic title skipping**: Links titled "docs", "wiki" won't appear if multiple links on same line.

### URL Normalization (fmhy-url.ts)

- **Reddit wiki redirects**: Convert `/r/FREEMEDIAHECKYEAH/wiki/<page>#wiki_anchor` links to current `https://fmhy.net/<route>#<anchor>` URLs.
- **Route aliases**: Keep legacy wiki/page names such as `adblocking`, `android`, `dev-tools`, `edu`, `non-eng`, and `torrent` mapped to current FMHY routes.
- **Generated category URLs**: Normalize stale category URLs such as `/adblocking/#adblock-filters` to current page anchors such as `/privacy#adblock-filters`.
- **Single source of truth**: Do not copy route alias maps into `parser.ts` or `search-fmhy.tsx`.

### Cache (cache.ts)

- **Schema versioning**: Cache is versioned (currently v4) to detect stale data.
- **Payload shape**: Version 4 uses key `fmhy-index-v4` and stores `{ version, timestamp, index: { results, categories } }`.
- **Legacy migration**: Version 3 payloads with top-level `results` can be read, converted to a v4-compatible index, and marked `isLegacy` so the UI asks the user to refresh.
- **Type guards**: Runtime validation prevents corrupted cache from crashing the app.
- **Graceful degradation**: If cache is corrupted, fall back to fresh fetch.

### Search (search.ts)

- **Token-based matching**: Split on spaces, all tokens must match (case-insensitive substring matching).
- **Searchable fields**: Title, URL, hostname, category, category URL, description, redirect/index/starred indicators, and related-link title/URL/group text.
- **No fuzzy matching**: Substrings match, but typos and alternative spellings are not corrected.
- **O(n) complexity**: Fine for ~10k results but inefficient beyond that.

### Error Handling (errors.ts)

- **Human-readable messages**: Error toasts should be user-facing, not technical.
- **Fallback strategy**: If fetch fails but cache exists, use cache and show warning toast.

## Guidance

- Keep these helpers UI-independent where possible.
- Prefer structured parsing and typed return values over ad hoc string handling in command files.
- Type guards are your friend: validate external data (cache, API responses) before use.
- The parser is complex but well-structured; changes should be localized to specific parsing concerns.
- Search is O(n) per keystroke; if adding features beyond token matching, consider profiling.
