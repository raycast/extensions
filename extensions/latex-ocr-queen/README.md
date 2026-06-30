# VLM Formula OCR

Raycast extension for turning formula screenshots into LaTeX.

It sends the selected image to an OpenAI-compatible vision model, then copies the
recognized LaTeX to the clipboard.

## Install Locally

```bash
npm install
npm run dev
```

Raycast will load the extension in development mode. Search for
`VLM Formula OCR` in Raycast.

## Basic Use

1. Run `VLM Formula OCR`.
2. Select the formula area when the macOS screenshot selector appears.
3. Wait for the toast to show success.
4. Paste the copied LaTeX where you need it.

## Image Source

The default source is `Capture Selection`. This is usually the simplest mode.

Other modes are available in Raycast preferences:

- `Finder Selection`: open Finder, single-click one formula screenshot file, keep
  Finder as the frontmost app, then trigger `VLM Formula OCR`.
- `Clipboard`: copy an image or image file first, then trigger the command.

`Auto` mode was removed because it made failures harder to understand.

## API Settings

The extension uses OpenAI-compatible Chat Completions vision requests.

Configure these fields in Raycast preferences:

- `Base URL`: API root, not the full `/chat/completions` path.
- `Model`: vision model name. If empty, the extension uses a default for known
  providers.
- `API Token`: token for the endpoint. This overrides environment variables.
- `Enable Thinking`: passes thinking options to compatible providers. Leave it
  off unless the selected model needs it.

Common examples:

| Provider    | Base URL                        | Model                        |
| ----------- | ------------------------------- | ---------------------------- |
| SiliconFlow | `https://api.siliconflow.cn/v1` | `Qwen/Qwen3-VL-32B-Instruct` |
| MiniMax     | `https://api.minimax.io/v1`     | `MiniMax-M3`                 |
| OpenAI      | `https://api.openai.com/v1`     | `gpt-4.1-mini`               |

For a custom endpoint, fill both `Base URL` and `Model`.

## Token Fallbacks

Raycast preferences are checked first. If `API Token` is empty, the extension
tries these environment variables:

- `VLM_OCR_API_TOKEN`
- `VLM_OCR_APITOKEN`
- `SILICONFLOW_API_TOKEN`
- `SILICONFLOW_APITOKEN`
- `SILICONFLOW_API_KEY`
- `MINIMAX_API_TOKEN`
- `MINIMAX_APITOKEN`
- `MINIMAX_API_KEY`
- `MINIMAX_SUBSCRIPTION_KEY`
- `OPENAI_API_TOKEN`
- `OPENAI_APITOKEN`
- `OPENAI_API_KEY`
- `CUSTOM_API_TOKEN`
- `CUSTOM_APITOKEN`

Raycast may not see variables from your interactive shell. If token detection is
unreliable, paste the token into the extension preferences.

## Notes

- SiliconFlow defaults to `Qwen/Qwen3-VL-32B-Instruct`.
- If that model is unavailable, the extension tries a few Qwen-VL fallback
  models unless you set `Model` manually.
- The screenshot command uses `/usr/sbin/screencapture`. If capture fails,
  check macOS Screen Recording permission for Raycast.

## Development

```bash
npm run typecheck
npm run build
npm run lint
```

For Raycast Store publishing, the `author` field in `package.json` must match
the Raycast account used by `npx ray login`.
