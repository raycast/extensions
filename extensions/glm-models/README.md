# GLM Models for Raycast

A Raycast extension that exposes [Z.ai](https://z.ai) / [BigModel](https://open.bigmodel.cn) GLM models to Raycast's built-in AI features — AI Chat, Quick AI, and AI Commands — using Raycast's [extension AI model provider](https://developers.raycast.com/ai/provide-ai-models) API.

## What it does

- Lists your account's GLM models (GLM-5.3, GLM-5.2, GLM-5.3-Flash, GLM-4.6, GLM-4.5 family, GLM-4.5V/4.6V vision models, …) in Raycast's model picker
- Streams completions straight from Z.ai's OpenAI-compatible API
- Supports reasoning (thinking + reasoning-effort picker), tool/function calling, image attachments on vision models, and system messages
- Works with both platforms: **Z.ai international** (`api.z.ai`) and **BigModel China** (`open.bigmodel.cn`) — switchable in preferences

## Requirements

1. **Raycast** 1.26.0 or newer, signed in with your Raycast account
2. **Raycast Pro** — Raycast requires a Pro subscription to *use* models provided by extensions
3. **Node.js** 22.22.2+ and **npm** 7+ (check with `node -v` — matches `@raycast/api`'s own requirement, also declared in `engines`)
4. **An API key**:
   - International: create one at [z.ai](https://z.ai) → API Keys (works with the `Z.ai (pay-as-you-go)` platform setting)
   - China: create one at [open.bigmodel.cn](https://open.bigmodel.cn) (works with the `BigModel (pay-as-you-go)` setting)

   Keys are **not interchangeable** between the two platforms. Pay-as-you-go API keys only — GLM Coding Plan and Team Plan keys are **not supported**.

## Setup

```bash
cd glm-models
npm install
npm run dev
```

Running `npm run dev` registers the extension locally in Raycast (it appears at the top of root search).

### First-run onboarding

The first time Raycast needs the extension's settings, it shows a setup form asking for every required preference together — **API Key** and **Platform** — with a help page (from `help.md`) beside the form. Pick the platform that matches where your key was created; the two platforms' keys are not interchangeable.

| Preference | What to enter |
| --- | --- |
| API Key | Your Z.ai or BigModel key |
| Platform | `Z.ai (pay-as-you-go)` or `BigModel (pay-as-you-go)` — must match where the key came from. Pay-as-you-go keys only: GLM Coding Plan / Team Plan keys are not supported |
| Custom Base URL | Only if you picked *Custom* (any HTTPS OpenAI-compatible endpoint) |
| Extra Models | Optional comma-separated model IDs to force-include in the picker |

After the setup form, validate everything with the **Check Setup** command: it calls the live API with your saved key and platform and tells you exactly what's wrong if they don't match (401 → key/platform mismatch), the endpoint is unreachable, or all good (N models discovered). It can also test a different key/platform combination before you commit it to preferences — a combination that differs from the saved one is reported as *validated, but not applied*, since extensions cannot change their own preferences — and its *Open Platform Console* action deep-links to the selected platform's API-keys page (z.ai or open.bigmodel.cn). Validating the saved combination also refreshes Raycast's model list.

Then opt in to extension models (one-time):

1. Open Raycast Settings → **AI** (or the model picker in AI Chat)
2. Enable models from extensions ("Allow AI Models" / toggle this extension on)
3. Open AI Chat or Quick AI, open the model picker, and pick a GLM model — `glm-4.5-flash` is free, a good first smoke test

While developing, keep `npm run dev` running for hot reload. Press `⌃C` to stop; the extension stays in Raycast. Re-run `npm run dev` after code changes.

The **Refresh Models** command validates the saved key + platform and re-runs model discovery in one step, reporting the outcome (e.g. "Z.ai (pay-as-you-go): 18 models available") — the one-step way to pick up a platform change from the settings (Raycast also refreshes automatically in the background, but it doesn't notify extensions when preferences change).

## How model discovery works

- The extension first calls `GET {baseURL}/models` with your key to get the models your account can actually use (handles platform differences and new releases automatically).
- Each ID is enriched with metadata (title, context window, vision/tools/reasoning capabilities) from the [models.dev](https://models.dev) community catalog, cached for 24h — BigModel reuses the Z.ai catalog since both platforms serve the same model IDs.
- IDs models.dev doesn't know get conservative defaults, so brand-new GLM models still show up and work.
- If the `/models` call fails, the models.dev model list is used instead; if that is unreachable too (e.g. first run offline), a small curated fallback keeps the picker populated: GLM-5.3, GLM-5.2, GLM-5.3-Flash, GLM-4.7, GLM-4.6, GLM-4.5-Flash.

Notes:

- Reasoning effort maps to Z.ai's `reasoning_effort` on GLM-5.x models, and to thinking on/off on GLM-4.x models (`none` disables thinking).
- Reasoning tokens stream into Raycast's collapsible thinking section (`reasoning-delta` parts).
- Image attachments are only delivered for models declared with vision (GLM-*-V and Flash multimodal models).

## Troubleshooting

- **Run "Check Setup" first** — it validates your saved key and platform against the live API and classifies the failure (key/platform mismatch, network, endpoint unavailable).
- **Changed Platform but the model picker is stale** — Raycast doesn't notify extensions when preferences change. Run **Refresh Models** to validate and refresh in one step. Note that **Check Setup** only validates: after testing a different platform or key, save it in the extension settings for it to take effect.
- **`AI_DownloadError: Cannot find module 'undici'` when attaching an image** — this happened in early versions of this extension: image attachments were converted to `data:` URLs, which the AI SDK tries to fetch, and that path requires the `undici` npm package which Raycast's runtime doesn't provide. Fixed by passing image bytes directly; if you see it again, run `npm run dev` so you're on the latest build.
- **No GLM models in the picker** — check the `npm run dev` console: it logs either `glm-models: discovered N model ids via …/models` (dynamic discovery worked) or `glm-models: /models lookup failed …` followed by which fallback list was used (models.dev or the curated catalog). Also confirm you toggled the extension on in Raycast Settings → AI.
- **401/403 errors** — your API key doesn't match the selected Platform (z.ai vs BigModel keys are not interchangeable).

## Publishing to the Raycast Store (optional, later)

This repo is currently a personal extension. If you want to publish it:

1. Have a GitHub account linked to Raycast (`npm run publish` authenticates with GitHub)
2. `npm run build` to validate for distribution
3. `npm run publish` — opens a pull request against the [raycast/extensions](https://github.com/raycast/extensions) repository
4. After Raycast team review and merge, the extension is published to the Store automatically

## Development

```
src/models.ts           AI model provider entry point: getModels + streamCompletion
src/lib/catalog.ts      Curated model metadata, /models discovery, preferences
src/check-setup.tsx     Command: validate key + platform against the live API
src/refresh-models.ts   Command: manually refresh the model list
```

- `npm run dev` — run in development mode with hot reload
- `npm run build` — production build / store validation
- `npx tsc --noEmit` — type check

The provider uses [`@ai-sdk/openai-compatible`](https://www.npmjs.com/package/@ai-sdk/openai-compatible) + Vercel AI SDK `streamText`, pointed at Z.ai's OpenAI-compatible endpoint. Provider options under the `zai` namespace (`thinking`, `reasoning_effort`) are forwarded into the request body by the compatible provider.
