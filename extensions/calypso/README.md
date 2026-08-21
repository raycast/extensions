# Calypso

Chat with **your own** model from Raycast — any OpenAI-compatible endpoint —
and give it web search, private-knowledge search and page fetching.

Two surfaces, and the difference between them is who drives:

|  | Driver | Raycast AI quota |
|---|---|---|
| **Chat with Calypso** command | your model | none |
| **AI Chat + `@calypso`** | Raycast's model, calling your tools | consumed |

## Why

Raycast's AI is excellent, but it talks to Raycast's models. If you run a model
yourself — llama.cpp, vLLM, Ollama, LM Studio, or anything else that speaks the
OpenAI API — this puts it behind the same keystroke, and gives it tools:

- **web_search** via a SearXNG instance you host
- **rag_search** against a private knowledge base, the one source no hosted
  assistant can reach
- **fetch_url** via Firecrawl

Every integration is optional. Leave a URL blank and that tool simply isn't
offered to the model.

## Commands

| Command | What it does |
|---|---|
| **Chat with Calypso** | Multi-turn conversation. Follow-ups resolve against the whole thread, including earlier tool results. Browse past chats, start a new one, or stop generation from the action panel. |
| **Ask Calypso** | One-shot question against whichever endpoint answers first |
| **Ask Primary Endpoint** | One-shot pinned to the primary server |
| **Ask Fallback Endpoint** | One-shot pinned to the fallback server |
| **Calypso Status** | Endpoint health, loaded model, context size |

## AI Extension tools

Type `@calypso` in Raycast AI Chat:

- `search-web` — search via your SearXNG
- `search-knowledge` — search your private RAG
- `fetch-page` — fetch a URL as Markdown
- `ask-calypso` — hand the whole question to your own model, which runs its own
  search and knowledge rounds and answers grounded

## Setup

Only one preference is required: **Base URL**, pointing at your model server
(e.g. `http://localhost:8080/v1`). Everything else is optional.

Configure a **Fallback Base URL** to have a second server tried when the first
does not respond, and a **Cloud Fallback** provider (Cerebras, Groq or
Inception) as a last resort when no local server is awake.

For tools, set any of **SearXNG URL**, **RAG API URL** (+ key) and
**Firecrawl URL**. A blank URL disables that tool rather than failing at call
time.

If your model server runs on another machine, make sure it is reachable from
the machine running Raycast — over LAN, or a VPN such as Tailscale.

## Notes

- Tool calling needs a server built with tool support (for llama.cpp, `--jinja`).
  Without it the extension detects the rejection on the first round and answers
  without tools instead of failing.
- If your server reserves a reasoning budget, keep **Max Tokens** well above it.
  The think block is spent first, so a tight cap returns an empty answer.
- Chat history is stored locally via Raycast's LocalStorage. Nothing is sent
  anywhere except to the endpoints you configure.
