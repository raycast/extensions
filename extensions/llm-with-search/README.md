# AI with Internet Search

Chat with your local Ollama models from Raycast, with optional internet search context and inline citations.

### Features
- Local LLM via Ollama (`/api/chat`)
- Optional web context via Serper.dev (Google Search API)
- Per-chat toggle to enable/disable web search
- Per-chat model selection from installed Ollama models or a custom name
- Persistent chat history in Raycast `LocalStorage`

### Requirements
- Raycast installed
- Ollama installed and running locally (`http://localhost:11434` by default)
- At least one model pulled in Ollama (e.g., `ollama pull llama3.2`)
- Optional: Serper.dev API key for web search context

### Get a Serper API Key
1. Go to `https://serper.dev` and sign in.
2. Create a project and generate an API key.
3. In Raycast → Extensions → AI with Internet Search → Preferences, paste the key into `Serper API Key`.
4. You can toggle web search per chat; without a key, the extension still works locally.

### Install
1. Clone this repository.
2. Install deps: `npm install`
3. Develop: `npm run dev`
4. Build: `npm run build`

### Usage
1. Open the command in Raycast: “AI with Internet Search”.
2. Type your message and press Enter or use the “Send Message” action.
3. Use actions:
   - “Enable/Disable Web Search” to toggle Serper context.
   - “Change Model” to pick from installed Ollama models or enter a custom model name.
   - “Rename Chat”, “New Chat”, “Delete Chat”, “Reset Conversation”, and “Copy Last Answer”.

### Screenshots
The extension includes a screenshot in `metadata/screenshot-1.png` used for store submission.

### Preferences
- `Ollama Base URL` (default: `http://localhost:11434`)
- `Ollama Model` (default: `llama3.2:latest`) — used when a chat has no custom model
- `Serper API Key` (optional) — needed only if you want web context

Notes:
- If `Serper API Key` is empty, web search returns no context, but chat still works locally.
- Per-chat model overrides the default model from preferences.

### Privacy and Terms
- This extension sends chat messages to your local Ollama server only.
- If you enable web search and provide a Serper key, your search query is sent to Serper.dev per their terms.
- You are responsible for complying with the licenses and terms of: Ollama, the model you use, and Serper.dev. Do not submit confidential or personal data.

### Model Licenses
- Models are installed and executed locally via Ollama. Each model has its own license/usage terms. Ensure your chosen model permits your intended use (commercial, redistribution, etc.).

### Publish to Raycast Store
- Ensure the metadata in `package.json` is accurate.
- Run: `npm run publish`
- You’ll be asked to authenticate with Raycast and provide store details.

### Troubleshooting
- “Failed to list Ollama models”: Ensure Ollama is running and reachable at the configured base URL.
- “Ollama error …”: Check the model name exists (`ollama list`) and that your server is running.
- “Serper: insufficient credits / invalid key”: Update your key or disable web search.

### License
MIT
