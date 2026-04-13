# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Raycast extension that provides LLM chat and AI generation services via the Pollinations AI API. First iteration: plain chat interface. Future: pre-built prompt templates and quick-use shortcuts.

API key is optional — if the user hasn't entered one, the extension falls back to the free (unauthenticated) Pollinations endpoint.

## Development Commands

```bash
npm install          # Install dependencies
npm run dev          # Start development mode with hot reload (runs in Raycast)
npm run build        # Production build
npm run lint         # ESLint
npm run fix-lint     # Auto-fix lint issues
```

To develop: run `npm run dev`, then open Raycast and search for the command name. Changes reload automatically.

## Tech Stack

- **Framework**: Raycast Extensions API (`@raycast/api`)
- **Language**: TypeScript
- **Build tool**: Raycast CLI (wraps esbuild)
- **Package manager**: npm

## Architecture

### Entry Points (`src/`)

Each file in `src/` that is listed under `"commands"` in `package.json` becomes a Raycast command. The main command for this project is the chat interface.

### Pollinations API Integration (`src/api/`)

Base URL: `https://gen.pollinations.ai`

- **Text/Chat**: `POST /v1/chat/completions` — OpenAI-compatible. Use with any OpenAI SDK by setting `baseURL`.
- **Images**: `GET /image/{prompt}?model=flux` or `POST /v1/images/generations`
- **Audio TTS**: `GET /audio/{text}?voice=nova`

Authentication: `Authorization: Bearer <API_KEY>` header or `?key=<API_KEY>` query param.

**Free tier**: Omit the API key entirely — the endpoint works without auth (rate limited).

### Preferences (`package.json` → `preferences`)

The Raycast `preferences` array in `package.json` drives the settings UI. The API key preference must be of type `"password"` and marked `required: false` so it's optional.

```json
{
  "name": "apiKey",
  "title": "Pollinations API Key",
  "description": "Leave empty to use the free tier",
  "type": "password",
  "required": false
}
```

Access in code via `getPreferenceValues<Preferences>()`.

### Key Models

Default text model: `openai` (GPT-5.4 Nano — fast, free tier friendly).  
For higher capability: `openai-large` (GPT-5.4).  
Streaming is supported via SSE (`stream: true`).

### Streaming Chat Pattern

```typescript
import { useAI } from "./hooks/usePollinationsChat"; // custom hook
// OR use fetch with ReadableStream for SSE
```

Use Raycast's `<Detail markdown={...} />` component with incremental state updates for streaming output display.

## Package.json Structure (Raycast-specific)

```json
{
  "name": "pollinations-ai",
  "title": "Pollinations AI",
  "description": "...",
  "icon": "icon.png",
  "author": "<your-handle>",
  "categories": ["Productivity", "Developer Tools"],
  "license": "MIT",
  "commands": [...],
  "preferences": [...],
  "dependencies": {
    "@raycast/api": "^1.x.x",
    "openai": "^4.x.x"
  },
  "devDependencies": {
    "@raycast/eslint-config": "...",
    "typescript": "..."
  },
  "scripts": {
    "build": "ray build -e dist",
    "dev": "ray develop",
    "lint": "ray lint",
    "fix-lint": "ray lint --fix"
  }
}
```

## Raycast Extension Conventions

- `assets/` — static assets (icon.png required at root)
- `src/` — all TypeScript source
- Commands export a default React component
- Use `showToast`, `Toast.Style` for error feedback
- `LocalStorage` API for persisting conversation history
- `Clipboard.copy()` for copy-to-clipboard actions
