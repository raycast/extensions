# oMLX

Use locally running [oMLX](https://omlx.com) models as AI providers in Raycast. Your models appear natively in AI Chat, Quick AI, and AI Commands — no cloud, no API costs.

## Requirements

- macOS with [Raycast](https://raycast.com/) installed
- [oMLX](https://omlx.com) installed and launched at least once
- At least one downloaded model

## Setup

1. Install oMLX and launch it once.
2. Install this extension.
3. Enter your oMLX API key (found in `~/.omlx/settings.json` under `auth.api_key`).

## AI Chat

Type `@omlx` in Raycast AI Chat to manage models conversationally — load, eject, search, download, check stats, and control the server without leaving the chat.

## Commands

### Manage Models

Browse loaded, available, and helper models. Load, eject, pin, favorite, or delete models. View model details and per-model performance stats.

### Download Model

Search HuggingFace and ModelScope for models to download. Filter to MLX-only models. Browse trending and popular models.

### Manage Downloads

Track HuggingFace and ModelScope download progress with live updates. Cancel, retry, or remove downloads; ModelScope tasks are labeled by source. If one source is unavailable, the other source's downloads stay visible with an inline warning and automatic recovery checks.

### Serving Stats

View prompt processing speed, token generation speed, cache efficiency, memory usage, and active models. Switch between session and all-time stats. View server logs.

### Check for Updates

Check if a new version of oMLX is available.

### Start/Stop Server

Start, stop, or restart the oMLX server.

### Open Web Dashboard

Open the oMLX web dashboard in your browser.

## Development

Install dependencies with `npm ci`, then run `npm run dev` to load the extension in Raycast. Run `npm test` for mocked streaming, search-race, update-notification, and download-routing regressions; these tests do not require a running oMLX server. Validate changes with `npx tsc --noEmit`, `npm run lint`, and `npm run build`. Run `npx ray evals` separately for conversational tool behavior.
