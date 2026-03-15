# Project: Raycast Dictionary Extension — Enhanced

## Objective

Enhance the existing Raycast Dictionary extension to support search history with permanent local caching, and multi-provider AI support (Gemini, Claude, OpenAI) with auto-detection from the API key format.

---

## Success Criteria

- [ ] User can look up a word/phrase and get a structured definition
- [ ] Multi-provider support: Gemini, Anthropic Claude, OpenAI — auto-detected from API key prefix
- [ ] Each lookup is cached permanently in Raycast LocalStorage; same word never triggers a second API call
- [ ] A "Recent Searches" command shows history as a list; clicking an entry shows the cached definition instantly
- [ ] Inline API key setup instructions shown in the preferences description for each provider's free tier
- [ ] Existing `look-up` command still works exactly as before from the user's perspective

---

## Architecture

### Commands

| Command | File | Description |
|---|---|---|
| `look-up` | `src/look-up.tsx` | Main lookup — takes word argument, checks cache first, falls back to API |
| `history` | `src/history.tsx` | List view of all cached entries, sorted by most recently looked up |

### Provider Detection (API Key Auto-detect)

```
key.startsWith("AIza")   → Google Gemini   (model: gemini-2.5-flash-lite-preview)
key.startsWith("sk-ant") → Anthropic Claude (model: claude-haiku-4-5-20251001)
key.startsWith("sk-")    → OpenAI           (model: gpt-4o-mini)
```

If the key doesn't match any prefix, show a `Toast.Failure` with guidance.

### Core Data Structures

```typescript
// src/types.ts
interface DictionaryEntry {
  word: string;           // normalized to lowercase for cache key
  phonetic: string;
  partOfSpeech: string;
  definition: string;
  examples: string[];     // 2-3 items
  synonyms: string[];     // 3-5 items
  provider: string;       // "gemini" | "claude" | "openai"
  cachedAt: number;       // Date.now() timestamp
}

interface Preferences {
  apiKey: string;
}

interface CacheIndex {
  words: string[];        // ordered list of cache keys, most recent first
}
```

### Cache Layer (`src/utils/cache.ts`)

- Key: `dict:${word.toLowerCase().trim()}`
- Index key: `dict:index` — stores `CacheIndex` (ordered list for history)
- Storage: `@raycast/api` `LocalStorage`
- TTL: none (permanent)
- On hit: return parsed `DictionaryEntry` directly, skip API
- On miss: call API, store result, prepend to index

```typescript
// Public API
async function getCached(word: string): Promise<DictionaryEntry | null>
async function setCached(entry: DictionaryEntry): Promise<void>
async function getHistory(): Promise<DictionaryEntry[]>   // most recent first
async function clearHistory(): Promise<void>
```

### AI Providers (`src/api/`)

```
src/api/
  index.ts     — detectProvider(key) + lookUpWord(word, key) dispatcher
  gemini.ts    — existing implementation (keep as-is, minor type update)
  claude.ts    — new: Anthropic SDK call with same DictionaryEntry output
  openai.ts    — new: OpenAI SDK call with same DictionaryEntry output
```

All three adapters must return `Promise<DictionaryEntry>` with identical shape.

For Claude and OpenAI, use structured JSON output (same schema as Gemini):
- Claude: `tool_use` or `response_format: { type: "json_object" }` + system prompt schema
- OpenAI: `response_format: { type: "json_object" }` + system prompt schema

### File Organization

```
src/
  look-up.tsx          — Main command (unchanged interface, adds cache check)
  history.tsx          — New: List of cached entries
  types.ts             — Shared types
  api/
    index.ts           — Provider dispatcher
    gemini.ts          — Google Gemini adapter
    claude.ts          — Anthropic Claude adapter
    openai.ts          — OpenAI adapter
  utils/
    cache.ts           — LocalStorage read/write helpers
    formatResponse.ts  — (keep if exists)
```

---

## Constraints & Tradeoffs

### Non-negotiable

- Cache key is always `word.toLowerCase().trim()` — "Ephemeral" and "ephemeral" hit the same cache entry
- No re-fetch on cached entries — user must use a "Re-fetch" action in history to force refresh
- Auto-detect provider — no separate provider preference field
- TypeScript only, no `any` types

### Acceptable Tradeoffs

- If key prefix is ambiguous (edge case), fail fast with a clear error toast rather than guessing
- Models are hardcoded per provider (not user-configurable in Phase 1)

### Out of Scope

- Raycast Glaze (private beta, no SDK)
- Multi-language support
- Favorites / bookmarking
- Word-of-the-day
- History search/filter (Phase 2)
- History export (Phase 2)

---

## Implementation Strategy

### Preferred Patterns

- `LocalStorage` from `@raycast/api` — do not use `node:fs` or external storage
- `getPreferenceValues<Preferences>()` for `apiKey`
- `showToast` for all async state: loading, success, error
- `async/await` only, no `.then()` chains
- One responsibility per file

### Anti-patterns

- No `console.log` in production code
- No `any` TypeScript type
- No hardcoded API keys
- No re-fetching if cache hit exists (unless explicit user action)

### Dependencies to Add

```json
{
  "@anthropic-ai/sdk": "^0.40.0",
  "openai": "^4.0.0"
}
```

Keep `@google/genai` as-is.

---

## Open Questions

- None blocking implementation. Provider model selections can be revisited if user wants to change defaults.

---

## Reference: API Key Prefixes

| Provider | Key Prefix | Free Tier Info |
|---|---|---|
| Google Gemini | `AIza` | Free tier at aistudio.google.com — generous daily limits |
| Anthropic Claude | `sk-ant-` | Free tier at console.anthropic.com — limited monthly credits |
| OpenAI | `sk-` | No free tier; pay-per-use at platform.openai.com |

---

## UI: History Command Layout

```
┌─────────────────────────────────────────┐
│ [Search history...]                     │
├─────────────────────────────────────────┤
│ ephemeral          noun  · 2 days ago   │
│ serendipity        noun  · 3 days ago   │
│ ubiquitous         adj   · 1 week ago   │
│ ...                                     │
└─────────────────────────────────────────┘

Actions on selected entry:
  - Enter → Show cached Detail view
  - Cmd+R → Re-fetch from API (force refresh)
  - Cmd+Delete → Remove from history
  - Cmd+Shift+Delete → Clear all history
```
