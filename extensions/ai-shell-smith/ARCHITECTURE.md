# Architecture: Engine Separation

## Overview

AI Shellsmith has a **separated architecture** where the core conversion engine is decoupled from the Raycast extension, enabling standalone usage across different environments.

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI Shellsmith                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────┐         ┌──────────────────────┐  │
│  │  Raycast Extension      │         │  Standalone CLI      │  │
│  │  (src/index.tsx)        │         │  (src/cli.ts)        │  │
│  │                         │         │                      │  │
│  │  • UI Management        │         │  • Argument Parsing  │  │
│  │  • State Management     │         │  • Env Var Loading   │  │
│  │  • History Display      │         │  • Output Formatting │  │
│  └────────────┬────────────┘         └──────────┬───────────┘  │
│               │                                 │               │
│               └─────────────────────┬───────────┘               │
│                                     │                           │
│                     ┌───────────────▼────────────────┐          │
│                     │   Conversion Engine            │          │
│                     │   (src/engine.ts)              │          │
│                     │                                │          │
│                     │  • convertPrompt()             │          │
│                     │  • EngineOptions interface     │          │
│                     │  • Context7 integration        │          │
│                     │  • Caching logic               │          │
│                     └────────────┬───────────────────┘          │
│                                  │                              │
│          ┌───────────────────────┼───────────────────────┐     │
│          │                       │                       │     │
│  ┌───────▼──────┐  ┌────────────▼───┐  │
│  │  Cache       │  │  Context       │  │
│  │ (cache.ts)   │  │ (context.ts)   │  │
│  │              │  │                │  │
│  │ • LRU        │  │ • Git Context  │  │
│  │ • 60s TTL    │  │ • Shell Info   │  │
│  │ • 128 max    │  │ • CWD          │  │
│  └──────────────┘  └────────────────┘  │
│          ┌──────────────────────┐      ┌────────────────┐    │
│          │ History              │      │ Config         │    │
│          │ (history.ts)         │      │ (config.ts)    │    │
│          │                      │      │                │    │
│          │ • Multi-shell parse  │      │ • Models       │    │
│          │ • History filtering  │      │ • System prompt│    │
│          │ • Tail optimization  │      │                │    │
│          └──────────────────────┘      └────────────────┘    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
src/
├── engine.ts           Core conversion engine (framework-agnostic)
├── cli.ts              Standalone CLI tool
├── cache.ts            In-memory LRU cache
├── context.ts          Environment context extraction
├── history.ts          Shell history parsing
├── config.ts           Configuration & constants
├── types.ts            Shared TypeScript types
├── utils.ts            Raycast-only helpers (LocalStorage, AppleScript)
└── index.tsx           Raycast extension

test/
├── engine.test.ts      Engine smoke tests (live API)
└── integration.test.ts Unit tests for cache / context / history

README.md               Project overview
ARCHITECTURE.md         This file
ENGINE.md               Engine usage guide
```

## Data Flow

### Raycast Extension

```
User Input
    ↓
index.tsx (executeConversion)
    ↓
engine.convertPrompt(EngineOptions)
    ├→ Check Cache
    │  ↓ (miss)
    ├→ Try Context7
    │  ├→ getContext7Answer() [CLI execution]
    │  └→ looksLikeSolidAnswer()
    │  ↓ (not solid or error)
    └→ AI Fallback
       ├→ buildContextualSystemPrompt()
       │  ├→ getShellHistory()
       │  └→ BuildContext()
       └→ OpenAI/Perplexity/Ollama API call
    ↓
Cache result
    ↓
Result: EngineResult
    ↓
Toast notification & History append
```

### CLI

```
Command Line Args
    ↓
cli.ts (argument parsing)
    ↓
convertPrompt() [from engine]
    ↓ (same as Raycast flow)
    ↓
result.command → stdout
result.error → stderr
```

## Interface Contracts

### EngineOptions (Input)

```typescript
{
  prompt: string;
  model: string;
  provider?: "openai" | "perplexity" | "ollama";
  webSearch?: boolean;
  apiKeys?: {
    openai?: string;
    perplexity?: string;
    ollama?: string;
    context7?: string;
  };
  urls?: {
    openaiUrl?: string;
    ollamaUrl?: string;
  };
  customModels?: {
    openai?: string;
  };
}
```

### EngineResult (Output)

```typescript
{
  success: boolean;
  command?: string;
  title: string;
  message?: string;
  source?: "context7" | "ai" | "cache";
}
```

## Key Design Decisions

### Framework-Agnostic Engine

- `engine.ts` has zero Raycast dependencies.
- Reusable in Node.js scripts, CLIs, bots, integrations.
- Clean interface via `EngineOptions` / `EngineResult`.

### Composable Modules

Small, focused files (`cache`, `context`, `history`, `validator`) that can be understood and tested independently.

### Hybrid Intelligence

- **Context7 first**: documentation lookup (fastest, most accurate).
- **AI fallback**: when Context7 returns nothing usable.
- **Cache**: 60 s TTL, LRU eviction at 128 entries, keyed by `cwd + "\x00" + prompt`.

### Multi-Provider

- OpenAI: `gpt-5.4-nano`, `gpt-5.4-mini`, `gpt-5-search-api` (with web search).
- Perplexity: `sonar-pro` (built-in web search).
- Ollama: `gpt-oss:20b-cloud`, `gpt-oss:120b-cloud`.

## Performance Characteristics

| Operation         | Latency       | Notes                          |
|-------------------|---------------|--------------------------------|
| Cached hit        | 1–5 ms        | In-memory map lookup           |
| Context7 hit      | 500–1000 ms   | `npx ctx7` exec + parsing      |
| AI query          | 1–3 s         | Network + token processing     |
| Context extraction| 50–200 ms     | `git` + shell history          |

## Extending the Engine

To add a new provider:

1. Add an entry to `MODELS_BY_PROVIDER` in `config.ts`.
2. Extend the `provider` union in `EngineOptions` (and `CommandPreferences` in `types.ts`).
3. Branch on the provider inside `convertPrompt()` for base URL / API key selection.

## Testing Strategy

- **Unit tests** (`test/integration.test.ts`) — cover cache, context extraction, history parsing.
- **Engine smoke tests** (`test/engine.test.ts`) — live API calls; skipped unless `OPENAI_API_KEY` is set.

## Future Enhancements

- Persist cache to disk
- Plugin system for custom providers
- Streaming output
- Interactive command refinement
