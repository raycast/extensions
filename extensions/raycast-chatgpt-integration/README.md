# Raycast ChatGPT Account Provider

Use models available through your ChatGPT/Codex account inside Raycast AI as a Custom Provider.

## What It Does

This extension signs in with your ChatGPT account, runs a local OpenAI-compatible proxy, and writes a Raycast `providers.yaml` entry for that proxy.

Raycast then talks to:

```text
http://127.0.0.1:18792/v1
```

The model list is generated from the OpenAI Codex adapter registry, not a hardcoded stale list.

## What It Solves

Raycast Custom Providers expect an OpenAI-compatible API endpoint. ChatGPT subscription access is OAuth/account-based instead of a normal API key.

This project bridges that gap:

- ChatGPT OAuth sign-in
- local `/v1/models`
- local `/v1/chat/completions`
- Raycast Custom Provider config generation
- reasoning effort passthrough when Raycast sends it

## Setup

Install dependencies:

```bash
npm install
```

Start the extension in Raycast development mode:

```bash
npm run dev
```

In Raycast, run these commands:

1. `Sign in with ChatGPT`
2. `ChatGPT Provider Status`
3. `Install Raycast AI Provider`

Then open Raycast Settings -> AI and enable Custom Providers. If the models do not appear immediately, fully quit and reopen Raycast.

## Files Written

Proxy state:

```text
~/.raycast-chatgpt-provider
```

OAuth credentials are stored in Raycast extension storage. Older file-based credentials are migrated and removed the first time the extension reads them.

Raycast provider config:

```text
~/.config/raycast/ai/providers.yaml
```

## Development Checks

```bash
npm run typecheck
npm test
npm run lint
npm run build
```
