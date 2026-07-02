# Kraft

Kraft is a Raycast AI tool collection. It is not tied to one model vendor. The core runtime is:

```text
Input -> Workflow -> Output -> Renderer -> Conversation
```

The default command is `Kraft`. It opens a tool menu first, not a translation or vendor settings page.

Raycast native Preferences only show where settings live. Real settings are handled inside Kraft to avoid bypassing validation.

## Install

```shell
git clone git@github.com:kilingzhang/raycast-kraft.git
cd raycast-kraft
npm install
npm run dev
```

## API Settings

Open `API Settings` from the Kraft menu and configure:

- `API Base`
- `API Key`
- `API Compatible`

Kraft currently supports two compatibility types:

- `OpenAI`: model list `/models`, chat `/chat/completions`
- `Claude`: model list `/models`, chat `/messages`

Before saving API settings, Kraft validates the connection:

1. Load the model list.
2. Pick the first model.
3. Send a `hi` chat request.
4. Save only after the chat request succeeds.

## App Settings

Open `App Settings` from the Kraft menu to configure app behavior:

- Default output language.
- Auto-load selected text or clipboard text.
- Auto-start the tool after input is loaded.
- Auto-copy result, metadata visibility, and history size.
- SOCKS5 proxy.
- OCR language, recognition level, and custom words.

## Tool Settings

Each tool has its own `Tool Settings`:

- `Model`: select from the model list.
- `Custom Model`: manually enter a model when needed.
- `Prompt`: the tool prompt, with runtime variables.
- `Renderer`: Markdown or plain text.
- `Conversation`: enables multi-turn follow-up for that tool.
- `Workflow`: preview of the current processing steps.

When saving tool settings, Kraft also sends a `hi` chat request with the selected model. Failed validation blocks saving.

Available variables:

```text
{{input}}, {{source}}, {{sourceLang}}, {{targetLang}}, {{toolName}},
{{isoTime}}, {{localeTime}}, {{timezone}}, {{conversation}}
```

## Default Tools

- Translate
- Polish Writing
- Summarize
- Explain
- Ask Selected Text
- Ask Clipboard
- Ask Screenshot

## Development

```shell
npm test
npm run lint
npm run build
```
