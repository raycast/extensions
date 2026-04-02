# Project Conventions

- Use `npm` to run build scripts (e.g. `npm run lint`, `npm run build`).

# Raycast Store Publishing

## Validate before publishing

Run `npm run build` to verify the extension compiles without errors.

## Publish to the Raycast Store

Run `npm run publish` to publish. This command:
1. Squashes commits and pushes them to the `lavrovpy/raycast-extensions` fork
2. Opens (or updates) a PR on `raycast/extensions`
3. Authenticates via GitHub

After the PR is opened, running `npm run publish` again pushes additional commits to the same PR.

## Pulling maintainer contributions

If a Raycast maintainer pushes commits to the PR branch (they can do this because "Allow edits from maintainers" is enabled), or you make edits directly on GitHub, `npm run publish` will fail until you run:

```bash
npx @raycast/api@latest pull-contributions
```

This merges external contributions into your local repo. Resolve any conflicts before running `npm run publish` again.

## Review and release

After the PR is opened, the Raycast team reviews it and may request changes. Once accepted and merged, the extension is automatically published to the Raycast Store.

# Testing

- Use Vitest's in-source testing (`if (import.meta.vitest)`) to test private code without exporting it. Tests live inside the source file, sharing the same closure. They are tree-shaken out of production builds.
- Do not export functions, constants, or types solely for testing purposes.

# Security Guardrails for AI Edits

- Never place secrets (API keys, tokens, passwords) in URLs or query parameters. Send them in headers or request bodies.
- Treat all model output and user input as untrusted. Escape or sanitize before rendering in Markdown/HTML/UI-rich fields.
- Never expose raw upstream errors, parser internals, or validation traces to users. Map failures to stable user-safe messages.
- Never interpolate raw user input into LLM prompts. First enforce strict length/shape validation and embed values as encoded literals (for example with `JSON.stringify`) instead of quoted string concatenation.
- Before finishing changes, run a quick security check for secret exposure, injection surfaces, and sensitive error leakage.

## Learned User Preferences

- For Raycast extension work (especially UI or API usage), verify current Raycast API documentation early in the task (for example the official mirror via Context7 `developers_raycast`).
- For multi-sense word translation, prefer one decisive primary action: save to history and flashcards, copy the chosen gloss, then dismiss with `closeMainWindow({ clearRootSearch: true })` instead of an extra results screen after picking a sense.
- Match list and detail behavior between History and the Translate screen Recent section (for example Show/Hide Detail as the primary action and the same markdown detail patterns).
- Prefer breaking storage or schema changes over optional legacy compatibility when the project is still greenfield and the simpler model is worth a reset.

## Learned Workspace Facts

- Word translation uses multiple Gemini-returned senses with user selection before persistence; phrase or text translation stays a single saved result without a sense picker.
- History can hold several rows for the same lemma when gloss or part of speech differs; saving the same sense again reuses the existing row id and updates its timestamp.
- Flashcard spaced-repetition progress is keyed by `Translation.id` via required `translationId` on each progress record, not by the lemma string alone.
- Gemini sense deduplication compares translation and part of speech only; same gloss+POS with different examples is treated as one sense.
