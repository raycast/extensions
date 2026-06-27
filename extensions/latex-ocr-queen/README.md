# LaTeX OCR Queen

Raycast extension for recognizing selected formula screenshots as LaTeX.

## Usage

1. Run `OCR Formula` in Raycast.
2. Drag to select the formula area with the macOS screenshot selector.
3. The recognized LaTeX is copied to the clipboard.

You can also switch `Image Source` in Raycast preferences to read a selected
Finder image or an image already on the clipboard.

The command reads provider tokens from Raycast preferences first, then falls back
to environment variables:

- `SILICONFLOW_API_TOKEN`
- `MINIMAX_API_TOKEN`
- `OPENAI_API_TOKEN`

It also accepts `SILICONFLOW_API_KEY`, `MINIMAX_API_KEY`, and `OPENAI_API_KEY`
as convenience fallbacks. MiniMax Token Plan users can also use
`MINIMAX_SUBSCRIPTION_KEY`.

## Providers

- SiliconFlow Qwen2.5-VL: `https://api.siliconflow.cn/v1`
- MiniMax: `https://api.minimax.io/v1`
- OpenAI: `https://api.openai.com/v1`
- Custom OpenAI-compatible endpoint

The request uses the OpenAI Chat Completions vision message shape. You can
override the model and custom base URL in Raycast preferences.

SiliconFlow's historical Qwen2.5-VL models may be disabled or deprecated on some
accounts. The extension now defaults to `Qwen/Qwen3-VL-32B-Instruct` and will
try a few SiliconFlow visual-model fallbacks unless you explicitly set `Model`
in preferences.

Raycast may not inherit variables from your interactive shell. If an environment
token is not visible to the extension, paste it into the command preferences.

## Development

The `author` field in `package.json` must match the registered Raycast username
used by `npx ray login`.

```bash
npm install
npm run typecheck
npm run dev
```
