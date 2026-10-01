# Changelog

## 1.2.4

### Fixed

- A null entry in a models.dev catalog response no longer discards every valid model in the same fetch (null rows are now skipped, like deprecated ones)
- Check Setup no longer double-submits: a ref-based in-flight guard closes the same-tick race that the `isValidating` state alone can't (React hasn't flushed it yet)
- Check Setup re-reads preferences at submit time — a key or platform changed in Extension Preferences while the form was open no longer validates against (and gets misclassified against) a stale snapshot
- The "Validated, but not applied" path now toasts "Validated — not applied" instead of a generic "Setup is working", matching the result text

### Changed

- Successful `/models` probes are cached in memory for 60 seconds (per base URL + key pair; failures never cached; overlapping polls share one fetch) — Raycast re-runs discovery every few seconds, which previously hit the live platform endpoint on every pass
- Discovery logging is change-only: the "discovered N model ids" line fires on first discovery or when the id set changes, not on every poll
- The curated fallback catalog documents when its ids were last verified against the live endpoint

## 1.2.3

### Added

- Store screenshots of the extension in use (in `metadata/`), shown on the extension details page in the Raycast Store

## 1.2.2

### Fixed

- Check Setup no longer implies that a validated combination took effect: a successful probe of a changed platform or key now reports "Validated, but not applied — the saved Platform is still …, update the extension preferences, then run Refresh Models" (previously only a changed key was flagged, a platform-only change looked applied)
- Refresh Models now validates the saved key + platform while refreshing and reports the outcome in the HUD ("\<Platform\>: N models available" or the validation failure) — the one-step way to pick up a platform change from the settings
- Check Setup also refreshes Raycast's model list after successfully validating the saved combination

## 1.2.1

### Added

- Check Setup now offers *Open Platform Console* — deep-links to the Z.ai or BigModel API-keys page for the selected platform (ported from alibaba-model-studio)

### Changed

- `PLATFORM_OPTIONS` and the models.dev slug map are now keyed by a typed `Platform` union, so a value that drifts from the manifest dropdown fails at compile time (ported from alibaba-model-studio); the README development file map now lists `src/check-setup.tsx`

## 1.2.0

### Added

- Model metadata (titles, context windows, vision/tools/reasoning capabilities) is now enriched from the [models.dev](https://models.dev) community catalog — cached for 24h with stale-cache fallback and retry backoff, so new GLM releases (GLM-4.7 family, GLM-5/5.1/Turbo) and Coding-Plan-only ids (e.g. `glm-5.3-highspeed`) show up with correct metadata without an extension update; BigModel reuses the Z.ai catalog since both platforms serve the same model ids

### Changed

- The curated catalog is now a last-resort fallback (live `/models` endpoint and models.dev both unreachable), trimmed to six flagships; the incorrect `glm-4.5v` 128K context entry is gone (models.dev supplies the correct 64K)
- The non-GLM id filter is only applied when models.dev metadata corroborates the ids, so a Custom base URL serving non-GLM ids (e.g. `gpt-*`, `qwen-*`) no longer shows an empty model list
- Models known to models.dev as non-thinking hide the reasoning-effort picker; unknown models keep it (benefit of the doubt)
- Code-review hardening: an empty/renamed models.dev provider section is treated as a failed lookup (stale cache + backoff instead of caching an empty catalog for 24h); cached metadata is validated before use; overlapping discovery passes share one models.dev fetch; the non-chat keyword blocklist always applies to live ids while only the GLM-prefix rule needs metadata corroboration; vision is derived from input modalities (the `attachment` flag only when undeclared, since it covers documents too); entries without declared modalities are kept; a discovery that filters out every id falls back to the curated list

## 1.1.7

### Changed

- Code-review hardening: fail fast with an actionable message when the API key or Custom base URL is unset instead of an opaque fetch error; the Custom base URL must be HTTPS, is pre-filled in Check Setup and falls back to the saved value; a missing API key no longer crashes model discovery; image attachments that aren't valid base64 (e.g. data-URL prefixed) are dropped with a warning instead of failing the turn; turns left with no content after part conversion are omitted; catalog lookups use own-property checks; refresh failures are logged; `engines` declared and `@types`/SDK versions pinned (with `zod` explicit) to dedupe nested type packages

## 1.1.6

### Changed

- Clarified setup guidance for GLM Coding Plan Team subscribers: Team Plan keys use the same endpoints as individual Coding Plans — pick a GLM Coding Plan option; the key-rejected error and the platform preference description now say so

## 1.1.5

### Added

- Z.ai logo on every model in Raycast's model pickers, with light and dark appearance variants via the `@dark` asset convention (`assets/z-ai-logo.png` / `assets/z-ai-logo@dark.png`) — replaces the default sparkle icon

## 1.1.4

### Changed

- Store submission preparation: `author` set to the Raycast username, categories corrected to schema-valid values (`Productivity`, `Developer Tools` — `AI` is not in the manifest enum), and the required ESLint + Prettier toolchain added (`lint` / `fix-lint` scripts, `@raycast/eslint-config`)

## 1.1.3

### Changed

- Renamed the extension to `glm-models` ("GLM Models") — the model family name shared by the Z.ai and BigModel platforms the extension serves

## 1.1.2

### Changed

- Code review cleanup: error handling around model refresh (command and Check Setup action), single preference read in `getModels`, flattened nested ternary in the `/models` response parser, documented the stream-type cast, removed a dead `"disabled"` reasoning-effort branch, and warned instead of silently dropping URL-shaped image attachments
- `npm audit fix`: updated transitive dependencies to clear 5 vulnerabilities (4 moderate, 1 high) in `undici`

## 1.1.1

### Changed

- Consistent platform terminology everywhere: `Z.ai (pay-as-you-go)`, `BigModel (pay-as-you-go)`, `Z.ai GLM Coding Plan`, `BigModel GLM Coding Plan` — raw preference values (e.g. `bigmodel`) are no longer shown in the Check Setup summary, and its description no longer assumes the Z.ai platform

## 1.1.0

### Added

- GLM Coding Plan platform options: `Z.ai Coding Plan` (`api.z.ai/api/coding/paas/v4`) and `BigModel Coding Plan` (`open.bigmodel.cn/api/coding/paas/v4`) — Coding Plan keys use different endpoints than pay-as-you-go keys

## 1.0.0

### Added

- GLM models (GLM-5.x, GLM-4.x and vision models) in Raycast AI Chat, Quick AI and AI Commands via the extension AI model provider API
- Z.ai (international), BigModel (China) and custom OpenAI-compatible endpoints, switchable in preferences
- Dynamic model discovery via the `/models` endpoint with a curated fallback catalog
- Streaming completions with thinking/reasoning effort support, tool calling and image attachments on vision models
- "Check Setup" command to validate the API key and platform against the live API
- "Refresh Models" command to re-run model discovery
- First-run onboarding: required API key and platform preferences with a setup help page

{PR_MERGE_DATE}
