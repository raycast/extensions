# Valerius Forge — Raycast Extension

**Forge AI-ready agent prompts and project briefs directly from Raycast — BYOK.**

Valerius Forge brings the full Valerius prompt-forge engine into Raycast. Type a brief, hit Forge, and get a production-quality system prompt or project specification — streamed live into the Raycast Detail view. All API calls go directly from your machine to your provider.

---

## Installation

> **Raycast Store** — Search "Valerius Forge" in the Raycast store and click Install.  
> *(Store listing pending approval — see Manual Install below in the meantime.)*

### Manual Install

```bash
git clone https://github.com/fratresmedai/valerius-raycast
cd valerius-raycast
npm install
npm run dev
```

Then import the extension in Raycast via **Extensions → Add Script Directory**.

---

## Configuration

Open Raycast Preferences → Extensions → **Valerius Forge** and set:

| Preference | Description | Example |
|------------|-------------|---------|
| **LLM Provider** | Dropdown — choose your AI provider | `openai` |
| **API Key** | Your provider API key (stored securely in Keychain) | `sk-...` |
| **Model** | Model name to use | `gpt-4o` |
| **Base URL** | Only needed for local LLMs | `http://localhost:11434/v1` |

---

## Commands

### Forge Prompt

Open with `Valerius: Forge Prompt` in Raycast.

1. Type your brief in the text area
2. Choose a mode: **Auto Detect**, **Agent Prompt**, or **Full Project**
3. Press `⌘ + Return` to forge
4. The result streams live into a Detail view
5. Press **Copy Result** to copy to clipboard or **New Forge** to start over

**Example briefs:**
- `"A customer support bot for a developer tools SaaS that handles billing escalations"`
- `"A React + Supabase real-time collaborative whiteboard app with auth and presence"`
- `"A medical triage assistant that collects symptoms and urgency scores"`

---

### Forge Selection

Open with `Valerius: Forge Selection` in Raycast.

Select any text in any app, then run this command. Valerius will immediately begin forging a prompt from the selected text and stream the result into a Detail view.

---

## Output Modes

| Mode | Description |
|------|-------------|
| **Auto Detect** | Valerius classifies the brief and picks the best mode automatically |
| **Agent Prompt** | Generates a full system prompt with persona, conversation flow, output format, guardrails, and a one-shot example |
| **Full Project** | Generates a coding-agent-ready project spec with architecture diagram, recommended stack, and time estimate |

---

## Supported Providers

| Provider | Dropdown Value | Notes |
|----------|---------------|-------|
| OpenAI | `openai` | GPT-4o, GPT-5, o3, o1 |
| Anthropic | `anthropic` | Claude 3.5 / 3.7 / 4 / 4.5 |
| Google | `google` | Gemini 1.5 / 2.0 / 2.5 |
| xAI | `xai` | Grok 2 / 3 / 4 |
| OpenRouter | `openrouter` | All models via a single key |
| Local | `local` | Ollama, LM Studio, any OpenAI-compatible endpoint |

---

## How BYOK Works

- Your API key is stored in **macOS Keychain** by Raycast (never in plain text)
- All requests go **directly** from your Mac to the provider's API
- No proxies, no middlemen, no usage telemetry
- You pay only your provider's standard rates

---

## Privacy & Safety

Valerius Forge includes a multi-layer content gate that blocks requests involving harmful content before they reach the LLM. Blocked requests never leave your device.

---

## License

MIT — © FratresMedAI
