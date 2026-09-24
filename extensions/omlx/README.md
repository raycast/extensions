# oMLX

Use locally running [oMLX](https://omlx.com) models as AI providers in Raycast. Your models appear natively in AI Chat, Quick AI, and AI Commands — no cloud, no API costs.

## Features

### AI Model Provider

oMLX models register as first-class AI providers in Raycast. Capabilities like vision and thinking are detected automatically from the server.

**Creativity** — Raycast's creativity picker maps to the `temperature` parameter sent to oMLX:

| Raycast creativity | Temperature |
|--------------------|-------------|
| None               | 0.0         |
| Low                | 0.5         |
| Medium             | 1.0         |
| High               | 1.5         |
| Maximum            | 2.0         |

When no creativity is selected, Raycast defaults to "None" (temperature 0). However, if oMLX receives no temperature in the request, it uses its own default from `~/.omlx/settings.json` → `sampling.temperature` (1.0 by default, equivalent to "Medium"). The Raycast model provider API doesn't support declaring a default creativity level, so users should set their preferred creativity in Raycast's AI settings.

**Reasoning effort** — For thinking-capable models (where oMLX reports `thinking_default: true`), Raycast shows a Low/Medium/High reasoning effort picker. The selection is forwarded as oMLX's `reasoning_effort` parameter. The default is "High", matching oMLX's default behavior of unlimited thinking budget.

### Manage Models

Browse all available models. Load, eject, pin to memory, or delete models directly from Raycast.

### Serving Stats

View speed (prompt processing / token generation), cache efficiency, memory usage, active models, and request counts.

### Start/Stop Server

Start, stop, or restart the oMLX server without leaving Raycast.

### Open Web Dashboard

Open the oMLX web dashboard in your browser for full access to settings, system stats graphs, and features not yet in the extension.

## Setup

1. Install [oMLX](https://omlx.com) and launch it once
2. Install this extension
3. Enter your oMLX API key (found in `~/.omlx/settings.json` under `auth.api_key`)

