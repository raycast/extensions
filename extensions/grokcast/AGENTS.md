# AGENTS.md

## Voice

Use Simplified Technical English in formal, operational, and other sensible components of the document where you're establishing specifics.
Use Plain Language in introductory, expository, friendly, and other sensible components of the document where you're drawing the reader in or keeping them engaged.

## Repository

This repository is Grokcast, a Raycast extension. Its Raycast Store title is "Grokcast (Grok with Your xAI Subscription)". It uses the user's own Grok or X subscription and xAI's official TypeScript SDK, so it can offer any native Grok feature. Voice (speech-to-text and text-to-speech) comes first. It must run in Raycast and in Tinycast.

- Use the user's xAI OAuth sign-in. Do not add an xAI API key option or a backend.
- Keep `src/lib/` free of Raycast imports so unit tests run under plain Node.
- Write code in idiomatic Effect v4. CONTRIBUTING.md lists the conventions. Fix Effect lint warnings in `src/` and `tests/` instead of disabling them.
- Do not add Alchemy, Cloudflare Workers, TanStack Start, Clerk, PlanetScale, drizzle, or turbo.
- Unit tests use Node's test runner (`node --import tsx --test`). Do not add tester-army/e2e, Vitest, Jest, or Playwright.
- Do not add ESLint or Prettier as dependencies. Lint and format are oxlint and oxfmt. `.prettierrc.json` only keeps the Raycast Store's Prettier check in agreement with oxfmt.
- Do not print, log, or commit tokens, device codes, or recorded audio.
- Renovate opens dependency updates with the shared `SolZeroAI/renovate-config` preset. `renovate.json` keeps `package-lock.json` on nub and holds back `@types/node` and `@types/react`. Do not add Dependabot version updates.
- Do not submit to the Raycast Store or cut a tag. Tegami and the maintainer do that.
