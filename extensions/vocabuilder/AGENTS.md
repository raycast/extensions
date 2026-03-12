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

# Security Guardrails for AI Edits

- Never place secrets (API keys, tokens, passwords) in URLs or query parameters. Send them in headers or request bodies.
- Treat all model output and user input as untrusted. Escape or sanitize before rendering in Markdown/HTML/UI-rich fields.
- Never expose raw upstream errors, parser internals, or validation traces to users. Map failures to stable user-safe messages.
- Never interpolate raw user input into LLM prompts. First enforce strict length/shape validation and embed values as encoded literals (for example with `JSON.stringify`) instead of quoted string concatenation.
- Before finishing changes, run a quick security check for secret exposure, injection surfaces, and sensitive error leakage.
