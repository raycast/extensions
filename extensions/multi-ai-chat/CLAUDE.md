## Project Overview

Multi AI Chat is a Raycast extension for macOS that sends one prompt to ChatGPT, Claude, Grok, and Perplexity. It puts the prompt in each provider's `q` URL parameter and opens the requested tabs sequentially. The providers use those URLs to start their responses.

Prompts therefore appear in browser URLs and may be retained in browser history or synchronized between devices. The extension intentionally does not use AppleScript, DOM injection, the clipboard, or response-state verification.

## Commands

- `npm test` — run the Node test suite
- `npm run build` — build the extension
- `npm run dev` — start Raycast development mode
- `npm run lint` — run ESLint and Raycast manifest validation
- `npm run fix-lint` — auto-fix lint issues
- `npx tsc --noEmit` — type-check without building

## Architecture

**Entry point:** `src/multi-ai-chat.tsx` — renders one text area plus a 0–5 tab selector for each service and is the Raycast binding point for the pure request builder and executor. It reads the browser only from the extension preference; an empty preference uses the macOS default browser, and Raycast's `open()` is passed to the executor.

**Core module:**

- `src/lib/prompt-urls.ts` — pure authoritative service catalog, URL builder, expansion of service counts into ordered tab requests, and testable sequential request executor. Service order is ChatGPT, Claude, Grok, then Perplexity. It uses `URL` and `URLSearchParams` semantics so reserved characters, Unicode, and line breaks are encoded correctly. A resolved opener call counts as an opened tab; the extension does not inspect whether a provider started or completed a response. A failed call is recorded while later URLs continue opening.

## Product Contract

- Every selected service defaults to one tab and accepts 0–5 tabs.
- Provider endpoints are fixed in code and use only the `q` parameter.
- Prompt length is not limited or truncated locally. Browser or provider limits may still apply.
- A selected browser bundle ID is passed to `open()`; otherwise `open()` uses the system default.
- Success copy must describe tabs as opened, not claim that a response was verified.

Do not use Computer Use to test this extension; rely on code inspection, automated tests, linting, and builds.