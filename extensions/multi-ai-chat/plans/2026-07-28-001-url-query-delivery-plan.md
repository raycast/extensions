# Deliver prompts through provider query URLs

**Date:** 2026-07-28  
**Status:** Implemented and locally verified in the working tree

## Goal

Replace browser-specific prompt pasting with a small, deterministic URL-delivery flow. The command should encode the prompt in each provider's `q` parameter, open the requested tabs, and stop there.

## Confirmed design decisions

1. Every prompt is transported in the URL. The user accepts that it can appear in browser history and browser synchronization.
2. Opening the query URL is expected to start the provider's response automatically; there is no manual-review-before-send mode.
3. Supported services, in canonical order, are ChatGPT, Claude, Grok, and Perplexity.
4. Each service keeps a 0–5 tab selector with a default of one tab.
5. Success means Raycast's URL-opening call resolved. The extension does not inspect the DOM or verify that a response started or completed.
6. The command has no per-run browser selector. It uses only the extension's `browser` preference, with an empty value delegating to the macOS default browser.
7. Prompt and URL length are not limited or truncated locally. Opening is best effort even for very long URLs.
8. Provider endpoints are fixed in source code rather than editable preferences.

## Defaults

- Keep one Raycast view command and one prompt `TextArea`.
- Use these exact endpoint shapes, with no hints, temporary-chat flags, or extra parameters:
  - `https://chatgpt.com/?q=%s`
  - `https://claude.ai/new?q=%s`
  - `https://grok.com/?q=%s`
  - `https://www.perplexity.ai/search?q=%s`
- Construct URLs with `URL` and `URLSearchParams`, not string replacement, so special characters, Unicode, and line breaks are encoded safely.
- Expand requests and open them sequentially in canonical service order; repeated tabs for one service stay adjacent.
- Continue after an individual opening failure and report the number opened plus up to three per-tab errors.
- Keep successful copy scoped to “tabs opened,” because provider response state is unobserved.
- Remove the page-load timeout preference and all AppleScript, browser-tab discovery, DOM injection, and clipboard behavior.
- Preserve the older refactoring plan as historical context.

## Implementation

- [x] Add Claude and query endpoints to the authoritative service catalog.
- [x] Add pure prompt URL construction and canonical request ordering.
- [x] Replace `broadcastPrompt()` with sequential `openPromptUrls()`.
- [x] Remove browser automation and browser-window-state modules.
- [x] Remove the per-run browser dropdown and `loadDelay` preference.
- [x] Update action, toast, manifest, and repository guidance copy.
- [x] Replace automation-state tests with URL construction, encoding, ordering, sequential opening, browser forwarding, and partial-failure tests.
- [x] Run tests, type-check, and build.
- [x] Run the complete Raycast lint successfully, including manifest, icon, ESLint, and Prettier validation.
- [x] Review the complete diff and confirm no stale automation references remain outside historical documentation.

## Verification

```sh
npm test
npx tsc --noEmit
npm run build
npm run lint
```

The complete Raycast lint passed with network access, including its remote manifest and author validation.
