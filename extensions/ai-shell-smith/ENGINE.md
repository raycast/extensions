# AI Shellsmith Engine

The conversion engine is decoupled from the Raycast extension, allowing you to use it as a standalone library or CLI tool.

## Installation

```bash
bun install
bun run build:cli
```

## CLI Usage

### Basic

```bash
bun run src/cli.ts "list files in current directory"
```

### With Options

```bash
# Specific model
bun run src/cli.ts -m gpt-5.4-mini "install nodejs"

# Perplexity provider
bun run src/cli.ts -p perplexity "search for web scraping tools"

# Enable web search (OpenAI only)
bun run src/cli.ts -w "latest npm packages for react"
```

### Environment Variables

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Perplexity
export PERPLEXITY_API_KEY="pplx-..."

# Ollama
export OLLAMA_API_KEY="ollama"           # optional
export OLLAMA_URL="http://localhost:11434"

# Context7 (optional documentation lookup)
export CONTEXT7_API_KEY="ctx7sk-..."

# Custom OpenAI-compatible endpoint
export OPENAI_URL="https://api.custom.com"
```

## Library Usage

```typescript
import { convertPrompt, type EngineOptions } from "./src/engine";

const options: EngineOptions = {
  prompt: "list files in current directory",
  model: "gpt-5.4-nano",
  provider: "openai",
  apiKeys: {
    openai: process.env.OPENAI_API_KEY,
    context7: process.env.CONTEXT7_API_KEY,
  },
  urls: {
    openaiUrl: process.env.OPENAI_URL,
    ollamaUrl: process.env.OLLAMA_URL,
  },
};

const result = await convertPrompt(options);

if (result.success) {
  console.log("Generated command:", result.command);
  console.log("Source:", result.source); // "context7" | "ai" | "cache"
} else {
  console.error("Error:", result.title, result.message);
}
```

## Architecture

### Engine Components

- **Cache** (`src/cache.ts`) — in-memory LRU with 60 s TTL.
- **Context** (`src/context.ts`) — git and shell context extraction.
- **History** (`src/history.ts`) — shell history parsing (zsh/bash/fish).
- **Engine** (`src/engine.ts`) — core conversion logic.

### Conversion Flow

1. **Cache check** — return cached result if hit.
2. **Context7 lookup** — try official docs.
3. **AI fallback** — OpenAI / Perplexity / Ollama.
4. **Cache** — store the result.

### Supported Providers

- **OpenAI**: `gpt-5.4-nano`, `gpt-5.4-mini`, `gpt-5-search-api` (with web search).
- **Perplexity**: `sonar-pro` (built-in web search).
- **Ollama**: `gpt-oss:20b-cloud`, `gpt-oss:120b-cloud`.

## Integration Examples

### Shell Alias

```bash
alias aiss='bun run /path/to/src/cli.ts'

aiss "find files modified in last 24 hours"
```

### Node.js Script

```javascript
const { convertPrompt } = require("./src/engine");

async function main() {
  const result = await convertPrompt({
    prompt: "deploy nodejs app to heroku",
    model: "gpt-5.4-nano",
    apiKeys: { openai: process.env.OPENAI_API_KEY },
  });

  if (result.success) console.log(result.command);
}

main();
```

## Testing

```bash
bun test                                                        # unit + integration tests
AI_SHELLSMITH_LIVE_TESTS=1 OPENAI_API_KEY="sk-..." bun test     # also runs live engine smoke tests
```

## Performance

- **Cached queries**: ~1–5 ms (in-memory lookup).
- **Context7 hits**: ~500–1000 ms (CLI execution + parsing).
- **AI generation**: ~1–3 s (network + token processing).

Cache key: `cwd + "\x00" + prompt` — same prompt in the same directory returns instantly.
