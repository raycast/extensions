# oMLX

Use locally running [oMLX](https://omlx.com) models as AI providers in Raycast. Your models appear natively in AI Chat, Quick AI, and AI Commands — no cloud, no API costs.

## Features

### AI Model Provider

oMLX models register as first-class AI providers in Raycast. Capabilities like vision, thinking, and tools are detected automatically from the server.

**Creativity** — Raycast's creativity picker (None → Maximum) maps to the `temperature` parameter. The extension forwards whatever temperature Raycast sends. oMLX's default temperature is 1.0, which matches Raycast's "Medium" level.

**Reasoning effort** — For thinking-capable models, Raycast shows a Low/Medium/High reasoning effort picker. The selection is forwarded as oMLX's `reasoning_effort` parameter. Default is "High", matching oMLX's unlimited thinking budget.

### Manage Models

Browse all models — loaded, available, helper, and on-disk. Load, eject, pin to memory, favorite, or delete models. View model details including size, context window, capabilities, and per-model stats.

### Download Model

Search and download models from HuggingFace or ModelScope. Filter HuggingFace results to MLX-only models. Browse trending and popular models when the search bar is empty.

### Manage Downloads

Track download progress with live updates. Cancel, retry, or remove downloads.

### Serving Stats

View speed (prompt processing / token generation), cache efficiency, memory usage, active models, and request counts. Switch between session and all-time stats. Drill into per-model stats. View server logs.

### Check for Updates

Check if a new version of oMLX is available, with installed version and update channel. A passive toast notification also appears when opening other oMLX commands if an update is available.

### Start/Stop Server

Start, stop, or restart the oMLX server without leaving Raycast.

### Open Web Dashboard

Open the oMLX web dashboard in your browser. Deep links to the relevant section based on context (models, downloads, stats, logs).

## Setup

1. Install [oMLX](https://omlx.com) and launch it once
2. Install this extension
3. Enter your oMLX API key (found in `~/.omlx/settings.json` under `auth.api_key`)
