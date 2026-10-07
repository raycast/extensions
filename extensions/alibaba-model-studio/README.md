# Alibaba Model Studio for Raycast

A Raycast extension that exposes [Alibaba Cloud Model Studio](https://www.alibabacloud.com/help/en/model-studio/) (Bailian / DashScope) models — Qwen, GLM, Kimi, DeepSeek, MiniMax and more — to Raycast's built-in AI features (AI Chat, Quick AI, and AI Commands) using Raycast's [extension AI model provider](https://developers.raycast.com/ai/provide-ai-models) API.

## What it does

- Lists your account's Model Studio models in Raycast's model picker
- Streams completions straight from DashScope's OpenAI-compatible API
- Supports reasoning (thinking on/off via DashScope's `enable_thinking`), tool/function calling, image attachments on vision models, and system messages
- Works with both regions — **International** (`dashscope-intl.aliyuncs.com`) and **China** (`dashscope.aliyuncs.com`) — switchable in preferences, plus any custom OpenAI-compatible endpoint

## Requirements

1. **Raycast** 1.26.0 or newer, signed in with your Raycast account
2. **Raycast Pro** — Raycast requires a Pro subscription to *use* models provided by extensions
3. **Node.js** 22.22.2+ and **npm** 7+ (check with `node -v` — matches `@raycast/api`'s own requirement, also declared in `engines`)
4. **An API key**:
   - International: create one at [modelstudio.console.alibabacloud.com](https://modelstudio.console.alibabacloud.com) → API Keys (works with the `Pay-as-you-go (International)` platform setting)
   - China: create one at [bailian.console.aliyun.com](https://bailian.console.aliyun.com) (works with the `Pay-as-you-go (China)` setting)

   Keys are **not interchangeable** between the two regions. Pay-as-you-go API keys only — Token Plan and Coding Plan keys (`sk-sp-…`) are **not supported**.

## Setup

```bash
cd alibaba-model-studio
npm install
npm run dev
```

Running `npm run dev` registers the extension locally in Raycast (it appears at the top of root search).

### First-run onboarding

The first time Raycast needs the extension's settings, it shows a setup form asking for every required preference together — **API Key** and **Platform** — with a help page (from `help.md`) beside the form. Pick the platform that matches where your key was created; the two regions' keys are not interchangeable.

> **Picked "Custom base URL"?** The setup form only collects the *required* preferences, so it never asks for the URL itself. After the form, set **Custom Base URL** in **Raycast Settings → Extensions → Alibaba Model Studio** to your HTTPS OpenAI-compatible endpoint (e.g. `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`), then run **Refresh Models**. Check Setup can validate a URL typed into it, but nothing typed there is ever saved.

| Preference | What to enter |
| --- | --- |
| API Key | Your Model Studio key |
| Platform | `Pay-as-you-go (International)` or `Pay-as-you-go (China)` — must match where the key came from. Pay-as-you-go keys only: Token Plan / Coding Plan keys are not supported |
| Workspace ID | Optional business-space ID for team accounts on pay-as-you-go platforms — sent as the `X-DashScope-WorkSpace` header |
| Custom Base URL | Only if you picked *Custom* (any HTTPS OpenAI-compatible endpoint) — not part of the setup form; set it in the extension settings |
| Extra Models | Optional comma-separated model IDs to force-include in the picker |

After the setup form, validate everything with the **Check Setup** command: it calls the live API with your saved key and platform and tells you exactly what's wrong if they don't match (401 → key/region mismatch), the endpoint is unreachable, or all good (N models discovered, listed below the result). It can also test a different key/platform combination before you commit it to preferences — a combination that differs from the saved one is reported as *validated, but not applied*, since extensions cannot change their own preferences — and its *Open Model Studio Console* action deep-links to the region's console. Validating the saved combination also refreshes Raycast's model list.

Then opt in to extension models (one-time):

1. Open Raycast Settings → **AI** (or the model picker in AI Chat)
2. Enable models from extensions ("Allow AI Models" / toggle this extension on)
3. Open AI Chat or Quick AI, open the model picker, and pick a model — `qwen3.7-plus` or `qwen-plus` are good first smoke tests

While developing, keep `npm run dev` running for hot reload. Press `⌃C` to stop; the extension stays in Raycast. Re-run `npm run dev` after code changes.

The **Refresh Models** command validates the saved key + platform and re-runs model discovery in one step, reporting the outcome (e.g. "Pay-as-you-go (International): 59 models available") — the one-step way to pick up a platform change from the settings (Raycast also refreshes automatically in the background, but it doesn't notify extensions when preferences change).

The **Show Models** command lists everything the extension provides to Raycast's model picker in a master-detail view: the searchable model list on the left, and the selected model's full metadata on the right — display title, model ID, context window, vision/reasoning/tools capabilities, whether it comes from the Extra Models preference, and where the list came from (the platform's live `/models` endpoint, or the models.dev / curated fallback when that is unreachable). Run it after changing preferences to see exactly what Raycast will receive.

## How model discovery works

- The extension first calls `GET {baseURL}/models` with your key to get the models your account can actually use (handles region differences and new releases automatically). The result is cached for 60 seconds in memory and mirrored to disk, so Raycast's frequent background polling doesn't re-fetch the endpoint.
- Each ID is enriched with metadata (title, context window, vision/tools/reasoning capabilities) from the [models.dev](https://models.dev) community catalog — provider slugs `alibaba` (International) and `alibaba-cn` (China) — cached for 24h.
- IDs the region catalog doesn't know are looked up in the vendor's own models.dev catalog (Zhipu's for `glm-*`, Moonshot's for `kimi-*`, DeepSeek, MiniMax), since the alibaba catalogs often lag the vendors'. The region catalog always wins on conflict.
- IDs no models.dev catalog knows get conservative defaults, so brand-new models still show up and work (raw ID as title, no vision flag — attachments stay off for unknown models because sending an image to a text-only model hard-fails). IDs spelled with an extra vendor dash (`qwen-3.8-max` vs the catalog's `qwen3.8-max`) still find their catalog row.
- If the `/models` call fails, the models.dev model list is used instead; if that is unreachable too (e.g. first run offline), a small curated fallback keeps the picker populated: Qwen3.7-Plus, Qwen3.6-Flash, Qwen3-Coder-Plus, Qwen-Plus, Qwen3-Max, Qwen-VL-Max, GLM-5.2, Kimi-K3. A Custom endpoint never receives the curated fallback — force-include its ids via **Extra Models**.

Notes:

- Reasoning maps to DashScope's `enable_thinking`: the effort picker's **none** sends `enable_thinking: false` to thinking-capable models; `enable_thinking: true` is never sent because models that don't accept the parameter reject the whole request.
- Reasoning tokens stream into Raycast's collapsible thinking section (`reasoning-delta` parts).
- Image attachments are only delivered for models declared with vision, and are passed to the API as raw bytes (`Uint8Array`), never as data URLs.

## Troubleshooting

- **Run "Check Setup" first** — it validates your saved key and platform against the live API and classifies the failure (key/region mismatch, network, endpoint unavailable).
- **Picked "Custom base URL" during setup and no models appear** — Raycast's first-run setup form only collects the required preferences (API Key, Platform), so the URL is still unset. Set **Custom Base URL** in the extension settings, then run **Refresh Models**. Check Setup only validates — a URL typed there is never saved.
- **Changed Platform but the model picker is stale** — Raycast doesn't notify extensions when preferences change. Run **Refresh Models** to validate and refresh in one step. Note that **Check Setup** only validates: after testing a different platform or key, save it in the extension settings for it to take effect.
- **No models in the picker** — check the `npm run dev` console: it logs either `alibaba-model-studio: discovered N model ids via …/models` (dynamic discovery worked) or `alibaba-model-studio: /models lookup failed …` followed by which fallback list was used (models.dev or the curated catalog). Also confirm you toggled the extension on in Raycast Settings → AI.
- **401/403 errors** — your API key doesn't match the selected region (China vs International keys are not interchangeable), or it is a Token Plan / Coding Plan key, which this extension does not support.

## Publishing to the Raycast Store (optional, later)

This repo is currently a personal extension. If you want to publish it:

1. Have a GitHub account linked to Raycast (`npm run publish` authenticates with GitHub)
2. `npm run build` to validate for distribution
3. `npm run publish` — opens a pull request against the [raycast/extensions](https://github.com/raycast/extensions) repository
4. After Raycast team review and merge, the extension is published to the Store automatically

## Development

```
src/models.ts           AI model provider entry point: getModels + streamCompletion
src/lib/catalog.ts      Platforms, endpoints, /models discovery with probe cache, models.dev enrichment, curated fallback
src/lib/format.ts       Shared display formatting (context window, capability labels, endpoint redaction)
src/lib/log.ts          Dev-gated console logging (Store builds carry no console output)
src/lib/refresh.ts      Shared validate-and-refresh flow for Check Setup and Show Models
src/check-setup.tsx     Command: validate key + platform against the live API
src/refresh-models.ts   Command: manually refresh the model list
src/show-models.tsx     Command: browse the models provided to Raycast
```

- `npm run dev` — run in development mode with hot reload
- `npm run build` — production build / store validation
- `npx tsc --noEmit` — type check

The provider uses [`@ai-sdk/openai-compatible`](https://www.npmjs.com/package/@ai-sdk/openai-compatible) + Vercel AI SDK `streamText`, pointed at DashScope's OpenAI-compatible endpoint. Provider options under the `dashscope` namespace (`enable_thinking`) are forwarded into the request body by the compatible provider.

## License

MIT — see [LICENSE](LICENSE).
