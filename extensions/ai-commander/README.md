# AI-Commander

Run your own AI prompts on selected text in any app, with your own API keys. Rewrite, translate, or summarize text in
place, review what changed, and keep refining the result.

A prompt is a template with Raycast's dynamic placeholders, so a new use case takes a form, not code.

## Setup

1. Get an API key. An [OpenRouter](https://openrouter.ai/keys) key covers every model family. For Claude, GPT, or
   Gemini you can also use a key from [Anthropic](https://console.anthropic.com/settings/keys),
   [OpenAI](https://platform.openai.com/api-keys), or [Google AI Studio](https://aistudio.google.com/apikey).
2. Open **Run Prompt** and add the key in the extension preferences.
3. Open **Models & Providers** and choose a default model.

## Examples

Five example prompts are ready on first launch. Edit or delete them like any other prompt.

| Prompt               | What it shows                                                                    |
| -------------------- | -------------------------------------------------------------------------------- |
| Simplify             | Changes highlighted in the result, and Ask for Changes to refine it              |
| Translate to English | Replacing the selection without a window, ideal with a quicklink hotkey          |
| Summarize            | A result to read and copy                                                        |
| Reply to Email       | The copied email as input, a form for tone and points, and pasting at the cursor |
| Extract Action Items | Today's date in the prompt, and a checklist added below the selected notes       |

## Commands

| Command              | What it does                                                                                          |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| Run Prompt           | Pick a prompt, review the result and its changes, ask for changes, and insert it.                     |
| Manage Prompts       | Create, edit, duplicate, import, and export prompts and snippets. Create quicklinks for your prompts. |
| Models & Providers   | Browse models, set favorites and the default model, test your keys, and choose the privacy mode.      |
| Run Prompt Quicklink | The target of prompt quicklinks. Started from the root search, it opens Run Prompt.                   |

## A Hotkey per Prompt

In **Manage Prompts**, choose **Create Quicklink** on a prompt and give the quicklink a hotkey in Raycast. Prompts that
replace, insert, or copy text then run without opening a window, unless they ask for arguments.

## Providers

| Family             | With its own key | Without it |
| ------------------ | ---------------- | ---------- |
| Claude             | Anthropic        | OpenRouter |
| GPT                | OpenAI           | OpenRouter |
| Gemini             | Google           | OpenRouter |
| All other families | –                | OpenRouter |

The keys decide the route, so each model is listed once and there is nothing to choose. Saved prompts follow when a
key is added or removed. A failing direct call never falls back to OpenRouter.

## Prompt Templates

| Placeholder                                                             | Value                                                   |
| ----------------------------------------------------------------------- | ------------------------------------------------------- |
| `{selection}`                                                           | Selected text                                           |
| `{clipboard}`, `{clipboard offset=1}`                                   | Clipboard and clipboard history (0–5)                   |
| `{argument name="tone"}`, `default="…"`, `options="a, b"`               | Asked for before the run                                |
| `{snippet name="…"}`                                                    | Text block from Manage Snippets                         |
| `{browser-tab}`, `format="markdown\|text\|html"`, `selector="…"`        | Current browser tab (needs Raycast's browser extension) |
| `{date}`, `{time}`, `{datetime}`, `{day}`, `offset`, `format`, `locale` | Current date and time                                   |

Modifiers chain with a pipe: `{clipboard | trim | uppercase}`. Available: `uppercase`, `lowercase`, `trim`,
`json-stringify`, `percent-encode`, `raw`. Inserted values are fenced with `"""`; `| raw` turns that off.

## Import and Export

**Export Prompts** in Manage Prompts saves prompts, snippets, and settings to a JSON file, never API keys.
**Import Prompts** reads these files and AI Commands in Raycast's JSON format, as shared on
[ray.so/prompts](https://ray.so/prompts).

## Privacy

- API keys stay in Raycast's encrypted preferences. They never reach storage, exports, logs, or error messages.
- Selected text and results are not stored or logged.
- Copied results stay out of Raycast's clipboard history.
- OpenRouter runs in strict mode by default: only endpoints with zero data retention and no data collection. If a model
  has no such endpoint, switch to standard mode in Models & Providers.
- Unpaid Gemini API tiers may use submitted content to improve Google's products. Use a key from a project with billing
  for sensitive text.
