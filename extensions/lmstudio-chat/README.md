# LM Studio Chat

Chat with local LLMs through [LM Studio](https://lmstudio.ai) directly from Raycast — fully local, no API keys, no data leaving your machine.

## Commands

### Chat

Starts a fresh conversation every time. Type your question in the top search bar (or pass it as a command argument from Raycast root search) and press Enter. The left column is a live **conversation map**: one row per question–answer turn, newest first, tagged with the model that answered and the turn's time. A green dot marks the turn that is currently streaming. The selected turn is shown on the right in a clean Quick AI style layout. To ask a follow-up, just keep typing in the top bar and press Enter — no extra pages. Switch models mid-conversation from the dropdown next to the search bar.

Attach files with **⌘⇧A** (files selected in Finder) or **⌥⌘V** (file/image in the clipboard). Images go to vision-capable models as real image input; text and code files are added to the prompt as context. Pending attachments show as a 📎 counter in the search bar and ship with your next Enter. Up to 5 attachments per message (text ≤ 200 KB; oversized images are automatically downscaled before sending).

### Chat History

Search all past conversations by title and continue any of them where you left off — the chat opens in the same conversation-map view. You can also copy the last answer of a chat or delete chats you no longer need.

### Manage Models

Lists the models downloaded in LM Studio and marks the loaded ones. Load or unload models and copy model ids without leaving Raycast.

## Getting Started

1. Install [LM Studio](https://lmstudio.ai) and download at least one model.
2. Start the server: open the LM Studio app, or run `lms server start` in a terminal. Default address is `http://localhost:1234`.
3. Open Raycast and run **Chat**.

## Preferences

| Preference | Default | Description |
| --- | --- | --- |
| Server URL | `http://localhost:1234` | LM Studio server base URL |
| API Token | – | Optional bearer token, sent as `Authorization: Bearer …` |
| System Prompt | – | Prepended to every conversation |
| Temperature | `0.7` | Sampling temperature (0.0–2.0) |
| Default Model | first loaded | Model id to preselect |

## Troubleshooting

- **"LM Studio is not running"** — the extension can't reach the server. Open the LM Studio app or run `lms server start`, then use the Retry action.
- **Model dropdown is empty** — no model is loaded on the server. Download a model in LM Studio and load it (the Manage Models command can load downloaded models). Model lists are fetched fresh from the server every 10 seconds, so models that aren't on the server never show up.
- **LM Studio runs on another machine** — set the Server URL preference to that machine's address (e.g. `http://192.168.1.20:1234`) and make sure the LM Studio server is configured to accept network connections.
- **"Model has no vision support"** — the selected model can't process images. Pick a vision-capable model (LM Studio shows a vision badge) or remove the image attachments; text file attachments work with every model.

## Development

```
npm install
npm run dev     # live development in Raycast
npm test        # unit tests (vitest)
npm run lint    # ray lint
npm run build   # ray build
```
