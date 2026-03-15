# CLAUDE.md — AI Assistant Instructions

This file guides Claude (or any AI assistant) when working on the Raycast Dictionary Extension. Read `type.md` first for full project context.

---

## Project Summary

A Raycast extension that looks up English words using the Google Gemini API and returns Cambridge-style definitions with example sentences. Built with TypeScript and the Raycast API.

---

## Key Conventions

### Language & Style
- **TypeScript only** — no plain JavaScript files in `src/`
- Use `async/await` — no `.then()` chains
- Prefer `const` over `let`; never use `var`
- Keep components small and focused — one responsibility per file.
- Use descriptive variable names; avoid abbreviations except common ones (`res`, `err`, `id`)

### Raycast Patterns
- Always use `getPreferenceValues<Preferences>()` for user-configurable values (API keys, etc.)
- Use `showToast` for all loading states and errors — never leave the user with a blank screen
- Wrap API calls in try/catch and show meaningful error messages via `showToast`
- Use `Detail` component for displaying rich formatted text (supports markdown)
- Use `Action.CopyToClipboard` so users can always copy the output

### AI API (Google Gemini)
- Model: `gemini-2.5-flash-lite-preview` — fast and cheap for short structured tasks
- Use structured output (`responseSchema` + `responseMimeType: "application/json"`) — do NOT rely on prompt formatting
- The response schema is defined in `src/api/gemini.ts` — do not change it without updating the `DictionaryEntry` type
- System prompt lives in `src/api/gemini.ts` — keep it concise and focused on accessibility for non-native speakers

### File Organization
```
src/
  look-up.tsx          # Main Raycast command (UI layer only)
  api/
    claude.ts          # All Anthropic API calls live here
  utils/
    formatResponse.ts  # Parse/clean AI response if needed
```

---

## What NOT to Do

- Do not store API keys in code — always use Raycast preferences
- Do not use `console.log` for debugging in production code — use `showToast` or remove logs
- Do not add features beyond the current phase (see `type.md`) unless asked
- Do not use `any` type in TypeScript — define proper interfaces
- Do not make the UI complex — the dictionary card should be readable at a glance
- Do not add unnecessary dependencies — Raycast API + Anthropic SDK is enough for Phase 1

---

## Current Phase

**Phase 1 — MVP**

Focus only on:
1. A single `look-up` command
2. Text input → AI call → `Detail` view output
3. API key in preferences
4. Copy to clipboard action

Do not implement history, favorites, or multi-language support yet.

---

## How to Run Locally

```bash
npm install
npm run dev
```

Then open Raycast, the extension will appear automatically in development mode.

---

## Preferences Schema (package.json)

The extension should declare one preference:

```json
{
  "name": "apiKey",
  "title": "Anthropic API Key",
  "description": "Your Anthropic Claude API key from console.anthropic.com",
  "type": "password",
  "required": true
}
```

---

## Output Format Contract

The AI response must follow this structure (enforced by the system prompt):

```
**word** /phonetic/
*part of speech*

**Definition:**
...

**Examples:**
1. ...
2. ...
3. ...

**Synonyms:** ...
```

If the response doesn't match this format, show it as-is — do not crash.

---

## Dependencies

```json
{
  "@google/genai": "^1.0.0",
  "@raycast/api": "^1.90.0"
}
```

No other runtime dependencies needed for Phase 1.
