# AGENTS.md

Guidance for coding agents working in this repository.

## What this is

A Raycast extension that exposes Z.ai / BigModel (GLM) models to Raycast's built-in AI features (AI Chat, Quick AI, AI Commands) via Raycast's extension AI model provider API: `ai.modelProvider` in `package.json` points to `src/models.ts`, which exports `getModels` and `streamCompletion`.

## Commands

- `npm run dev` — development mode with hot reload; registers the extension in Raycast
- `npm run build` — production build / store validation (`ray build -e dist`)
- `npx tsc --noEmit` — type check
- `npm audit` — dependency vulnerability check; must report **0 vulnerabilities** before finishing any change
- `npm run publish` — publish/update the Raycast Store PR (opens or updates the PR to `raycast/extensions`; needs GitHub auth; squashes the PR branch each run — never rename the extension mid-review, and never have personal/uncommitted tweaks in the tree when running it: publish commits the working tree)

Both `tsc --noEmit` and `npm run build` must pass, and `npm audit` must report 0 vulnerabilities, before finishing any change. Fix audit findings by moving to a vulnerability-free pin set — `ai 5.0.222` + `@ai-sdk/openai-compatible 1.0.46` is the current clean, mutually-released pair. Every later 5.0.x release (`5.0.223` through at least `5.0.271`, re-verified 2026-10-01 after the Socket supply-chain comment on the Store PR) pulls a vulnerable `undici` transitively via `@ai-sdk/provider-utils` ≥ 3.0.31 — 5 advisories, and npm's only suggested fix is the breaking `openai-compatible` 3.x major. Never use `npm audit fix --force` here: it jumps SDK majors (e.g. `openai-compatible` 1.x → 3.x) and breaks the provider API. `@raycast/utils` (^2.3.2, used for `showFailureToast`) is the only other runtime dependency and audits clean.

## Architecture

- `src/models.ts` — the model provider entry point. `getModels`: hybrid discovery (live `GET {base}/models` for ids, metadata enriched from models.dev, fallbacks on failure — see catalog). `streamCompletion`: converts Raycast `ModelMessage`s to Vercel AI SDK `ModelMessage`s, then `streamText` via `@ai-sdk/openai-compatible` and returns `{ fullStream }`.
- `src/lib/catalog.ts` — platform constants and endpoints, `PLATFORM_OPTIONS` (the single source of platform labels), `resolveBaseURL`, `platformTitle`, `probeModelsEndpoint` (classified failure reporting), model-metadata enrichment from models.dev (`loadModelMetadata`: 24h LocalStorage cache, stale-cache fallback, retry backoff; BigModel reuses the Z.ai slug `zai` since models.dev has no BigModel slug), a small last-resort curated catalog, preference reading.
- `src/lib/log.ts` — `log()` helper: dev-only diagnostics (`environment.isDevelopment` gate, `glm-models:` prefix). All diagnostics go through it — no bare `console.*` in `src/`.
- `src/check-setup.tsx` — Check Setup command: validates a key + platform combination against the live API, deep-links to the web console.
- `src/refresh-models.ts` — Refresh Models command (`AI.refreshModels()`).
- `help.md` — rendered beside Raycast's required-preferences setup form (root of repo).

## Conventions and gotchas

- **Terminology**: platforms are `Z.ai` and `BigModel`, plus the `Custom base URL` option. **Pay-as-you-go only — GLM Coding Plan / Team Plan support was removed at Raycast's request in the 2026-10-02 Store review** (Coding Plan quota covers only officially supported coding tools; Raycast is not allowlisted). Never re-add `zai-coding` / `bigmodel-coding` platform options or the `/api/coding/paas/v4` endpoints to the Store version. Never show raw preference values (`zai`, `bigmodel`, `custom`) in UI — use `platformTitle()`. The Check Setup dropdown renders from `PLATFORM_OPTIONS`; the manifest's dropdown `data` in `package.json` is the one unavoidable duplicate — keep both in sync.
- **Icons** must live in `assets/` (`"icon": "icon.png"` resolves against `assets/`). A root-level `icon.png` is silently ignored and never bundled.
- **Image attachments** must be passed to `streamText` as `Uint8Array` bytes, never `data:` URL strings — the AI SDK fetches URL-shaped data through a Node path that requires the standalone `undici` package, which Raycast's runtime does not provide.
- **Provider options**: keys under the `zai` namespace in `providerOptions` are spread into the request body by `@ai-sdk/openai-compatible` — that's how `thinking` and `reasoning_effort` reach the API.
- **Reasoning mapping**: GLM-5.x keeps thinking enabled and steers depth via `reasoning_effort`; GLM-4.x only supports `thinking.type` enabled/disabled.
- **Preferences**: `apiKey` (password, required) and `platform` (dropdown, required, deliberately no default so the native setup form asks for it) trigger Raycast's first-run setup form, which renders the preference descriptions and `help.md`.
- **Validate vs apply**: Raycast extensions have no API to write preferences and no preference-change event. Check Setup is therefore validate-only — a probe of a combination that differs from the saved one must say "Validated, but not applied" and point at the native settings. The one-step path after a settings change is Refresh Models (validate-then-refresh with an outcome HUD); Check Setup also calls `AI.refreshModels()` after successfully validating the saved combination.
- **Versioning**: the Store PR is not merged yet, so `CHANGELOG.md` stays a single `## Initial Version - {PR_MERGE_DATE}` entry and `version` stays `1.0.0` (reset from 1.3.1 at the reviewer's request). Pre-merge changes do NOT bump the version or add entries. Only after the Store merge: every change bumps `version` and adds an entry dated with `{PR_MERGE_DATE}`.
- **Store bundle**: `.raycastignore` keeps internal agent/workspace files (`AGENTS.md`, `.zcode/`, `.zcodeignore`) out of the published extension — they stay tracked locally for agent guidance. User-facing docs shipped to the Store: `README.md`, `CHANGELOG.md`, `metadata/`, `help.md`. Manifest extras required by the Store review: `"platforms": ["macOS"]` (Windows unverified) and `"subtitle": "GLM Models"` on every command.
- Endpoints: PAYG `https://api.z.ai/api/paas/v4` and `https://open.bigmodel.cn/api/paas/v4` — the only endpoints the extension ships. Keys are not interchangeable across platforms. (Coding Plan endpoints exist upstream but are deliberately not mapped.)

## Verification

Live behavior needs an API key and Raycast Pro (extension-provided models are Pro-only). Watch the `npm run dev` console for `glm-models:` log lines — they report whether model discovery used the live `/models` endpoint or a fallback list (models.dev or the curated catalog), and whether models.dev itself was reachable.
