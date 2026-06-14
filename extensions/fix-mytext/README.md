# Fix My Text

Fix My Text is a Raycast extension for revising short pieces of text with a local OpenAI-compatible model.

It is meant for the small edits that interrupt normal work: fixing grammar, making a note clearer, tightening a message, or shifting tone before pasting it somewhere else.

The extension sends the text you enter to the endpoint you configure. Use a localhost URL if you want the request to stay on your machine.

## What it does

- Takes text from a Raycast form or command argument.
- Offers presets for grammar, clarity, professional tone, casual tone, and concision.
- Sends the request to the local chat completions server you configure.
- Shows the revised text beside the original.
- Copies revised text with Raycast clipboard history concealment enabled by default.

## Local model runtimes

Any local server that exposes an OpenAI-compatible `/v1/chat/completions` endpoint should work.

Common starting points:

- Ollama: `http://127.0.0.1:11434/v1`
- LM Studio: `http://127.0.0.1:1234/v1`
- llama.cpp server: use the host and port you started it with, followed by `/v1`

Set the `Model` preference to the model name your runtime expects. For example, an Ollama setup might use `llama3.2`; an LM Studio setup might use the loaded model name shown in the app.

The API key can usually stay blank for local runtimes. Fill it only if your server requires one.

## Example workflow

One useful setup is VoiceInk plus a local `llama.cpp` server:

1. Dictate text with [VoiceInk](https://github.com/beingpax/VoiceInk).
2. Run a local OpenAI-compatible server, such as `llama-server`.
3. Set Fix My Text to that server's `/v1` endpoint.
4. Use Raycast to clean up the dictated text before pasting it.

For a `llama.cpp` server running on port `11435`, the Fix My Text preferences would be:

- `Base URL`: `http://127.0.0.1:11435/v1`
- `Model`: the alias passed to `llama-server`, for example `local-llm`
- `API Key`: blank, unless your server requires one

## Setup

Install dependencies:

```bash
npm install
```

Start the extension in Raycast development mode:

```bash
npm run dev
```

Then open the command in Raycast and set the preferences:

- `Base URL`: your local OpenAI-compatible server URL
- `Model`: the model name your runtime expects
- `API Key`: optional

## Troubleshooting

When a revision fails, the cause is usually the local server rather than the extension.

- A timeout means the server did not answer within two minutes. Check that it is running and that the `Base URL` matches its host and port. A large model can also be slow on the first request, while it loads.
- A "model not found" error means the `Model` name does not match anything the server has loaded. Use the exact name the runtime expects.
- An empty response means the model gave back nothing usable. Switch models, or add a custom instruction to push it in the right direction.
- If the request never connects, the server is probably down or the `Base URL` is wrong. Start the server and double-check the port.

## Development

Run the test suite:

```bash
npm test
```

Run Oxc lint and format checks:

```bash
npm run lint
```

Format files with Oxfmt:

```bash
npm run format
```

Build the extension:

```bash
npm run build
```

## Store prep

Before submitting to the Raycast Store:

- Run `npm test`, `npm run lint`, and `npm run build`.
- Capture Raycast screenshots with Window Capture and choose `Save to Metadata`.
- Create `media/` only if README images are added later.
- Add release notes to `CHANGELOG.md`.
- Run `npm run publish` only when you are ready to open the Raycast Store submission pull request.
