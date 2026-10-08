# Changelog

## 1.1.0 - 2026-10-04

- New **Show Models** command: browses every GLM model provided to Raycast's model picker — display titles, model IDs, context windows, vision/reasoning capabilities, and which entries come from the Extra Models preference — and shows where the list came from (the platform's live `/models` endpoint, or the models.dev / curated fallback when that is unreachable)
- Check Setup now lists the discovered models (previously count only) after successfully validating the saved setup
- Explicit refreshes (Refresh Models, and the refresh action in Check Setup / Show Models) now also re-read the models.dev metadata cache, so model ids that are new since the last discovery get real titles and context windows immediately instead of after the 24h TTL
- The refresh action reports the live probe outcome — a failed key or endpoint shows "Refreshed, but validation failed" instead of a false success — via a shared refresh path in all three commands; Check Setup's guidance no longer echoes the custom URL (it refers to the field the user just typed), and GLM-4.x models now say their reasoning is a thinking on/off toggle rather than adjustable effort
- Show Models keeps the last good list on a transient failure (and a failed refresh keeps it too, staying in sync with what Raycast's picker shows, with a pinned "Last refresh failed" row so the failure is visible in the command), shows a loading bar instead of an empty state during the first load, only tags Extra Models entries that live discovery didn't already return, and redacts credentials from every displayed endpoint and failure message — including partially malformed custom URLs
- Check Setup's model list no longer holds the validation spinner, is capped with a pointer to Show Models, marks Extra Models entries, and shows an explicit row when the saved setup registers zero models
- Show Models is now a proper master-detail view — the model list on the left, all metadata for the selected model on the right as a single compact grid (description, model ID, context window, vision/reasoning/tools, origin, endpoint, discovery source) with no dead space or scrolling; no longer shows duplicate title/ID rows for models without catalog metadata, and fixes an ActionPanel nesting warning that silently dropped the refresh/console actions from its items
- The last successful `/models` discovery is mirrored to LocalStorage (60s TTL, keyed by a fingerprint that never stores the API key), so Raycast's frequent background polling no longer re-fetches the endpoint or re-logs the same line after the extension is re-instantiated; the persisted signature and all log lines carry only the redacted endpoint, never credentials

## 1.0.1 - 2026-10-04

- Clearer Custom base URL setup: Check Setup now shows whether a Custom Base URL is saved, flags that a URL typed into it is never saved, and points to Extension Preferences → Custom Base URL + Refresh Models — Raycast's first-run setup form only collects the required preferences (API Key, Platform), so a Custom setup commonly starts without the URL
- The Platform preference description and help.md guide Custom base URL users to set the URL in the extension settings right after the first-run setup form
- help.md and README.md document the Custom base URL path after the first-run setup form

## Initial Version - 2026-10-02

- Adds Z.ai and BigModel GLM models to Raycast's AI Chat, Quick AI and AI Commands via Raycast's extension AI model provider API
- Live model discovery from the platform's `/models` endpoint, enriched with titles, context windows and capabilities from models.dev (24h cache), with a curated fallback so the picker is never empty
- Streaming completions with thinking / reasoning-effort control, tool & function calling, image attachments on vision models, and system messages
- Pay-as-you-go API keys for Z.ai or BigModel (plus any Custom HTTPS OpenAI-compatible base URL)
- **Check Setup** command: validates a key + platform combination against the live API, can test a different combination without applying it, and deep-links to the platform's API-keys console
- **Refresh Models** command: validates the saved setup and re-fetches the model list in one step
