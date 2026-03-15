# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Raycast extension that grammar-checks clipboard text using OpenAI or Google Gemini. OpenAI authenticates via OAuth PKCE (same flow as Codex CLI, requires ChatGPT Plus or Pro). Gemini uses a free API key.

## Commands

```bash
bun install          # Install dependencies
bun run dev          # Start Raycast development mode
bun run dev:mock     # Dev mode with mock API responses (no real calls)
bun run build        # Build for production
bun run lint         # Lint
bun run fix-lint     # Lint with auto-fix
bun run test         # Run tests (vitest)
bun run test:watch   # Run tests in watch mode
```

Run a single test file:
```bash
bunx vitest run src/lib/__tests__/api.test.ts
```

## Linting

`bun run lint` runs three checks in order: package.json validation, ESLint, and Prettier. `bun run fix-lint` auto-fixes what it can. ESLint config is in `eslint.config.mjs` (flat config using `@raycast/eslint-config`). `raycast-env.d.ts` is excluded from ESLint (auto-generated file).

Git hooks in `.githooks/` (configured via `core.hooksPath`):
- **pre-commit**: runs ESLint + Prettier on staged files (excludes `raycast-env.d.ts`)
- **pre-push**: runs `bun run test`

After cloning, run:
```bash
git config core.hooksPath .githooks
```

## Architecture

Single-command extension (`check-grammar`) with a provider-based architecture:

- **`src/check-grammar.tsx`** — Main React component. Handles all UI states: auth prompt, loading animation (ASCII art + progress bar + timer), result view with inline diff (LCS-based word diff), history list/detail views. Reads user preferences for model and prompt. Supports mock mode via `.mock` file. Validates clipboard content before making API calls.
- **`src/lib/oauth.ts`** — OpenAI OAuth 2.0 PKCE flow against `auth.openai.com`. Spins up a temporary HTTP server on port 1455 (binds to `127.0.0.1`, redirect URI uses `localhost`). Requires ChatGPT Plus or Pro account. Tokens stored in Raycast `LocalStorage` with automatic refresh.
- **`src/lib/api.ts`** — Shared helpers (JWT decoding, account ID extraction, SSE stream parsing) and unified `checkGrammar()` entry point that routes to the appropriate provider based on model name.
- **`src/lib/providers/codex.ts`** — ChatGPT Codex backend provider. Calls `chatgpt.com/backend-api/codex/responses` with streaming SSE. Sends `ChatGPT-Account-ID` header extracted from JWT.
- **`src/lib/providers/gemini.ts`** — Google Gemini provider. Calls `generativelanguage.googleapis.com/v1beta` with API key auth and streaming SSE.
- **`src/lib/providers/openai-constants.ts`** — OpenAI OAuth and API constants (client ID, endpoints, scopes).
- **`src/lib/providers/gemini-constants.ts`** — Gemini API constants (endpoint URL).
- **`src/lib/history.ts`** — Persists grammar check history in `LocalStorage`. Max 50 entries, auto-expires after 7 days.
- **`src/lib/log.ts`** — Debug logging to file in extension support path.

### Preferences

Defined in `package.json` under `preferences`:
- **model**: dropdown with OpenAI models (gpt-5.4 default, plus others) and Gemini models (2.5-flash, 2.5-pro)
- **prompt**: text field for custom grammar check instruction
- **geminiApiKey**: password field for Gemini API key (required for Gemini models)

Mock API mode is enabled via `bun run dev:mock` (creates a `.mock` file in the Raycast extension directory). Skips auth and returns mock corrections. `bun run dev` cleans it up automatically.

## Testing

Tests use vitest with `@raycast/api` aliased to a stub at `src/lib/__tests__/__mocks__/raycast-api.ts` (configured in `vitest.config.ts`). Tests that need real `LocalStorage` behavior use `vi.mock` to provide an in-memory store (see `history.test.ts`). Provider tests mock `fetch` globally (see `providers/codex.test.ts`, `providers/gemini.test.ts`).
