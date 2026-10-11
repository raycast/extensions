<p align="center">
  <img src="https://github.com/wojciechkrol/alice-ai-raycast/raw/master/assets/icon.png" alt="Alice AI" width="128">
</p>

<h1 align="center">Alice AI - Your Daily AI Actions Companion</h1>

# 📚 Introduction

Alice AI lets you run reusable AI actions on selected text directly in Raycast. You can create your own action library, run one-off custom prompts, and review response history with token and cost metadata.

The extension now supports both OpenAI and Google Gemini models.

# 🚀 Getting Started

1. Install the extension in Raycast.
2. Open extension settings and add API keys (optional, depending on provider):
   - `OpenAI API Key` for OpenAI models
   - `Gemini API Key` for Gemini models
3. Run `Select Action` and execute an action on selected text.

Notes:

- API keys are not required globally.
- A key is required only when you use a model from that provider.

# 🧭 Commands

- `Select Action`: Browse, search, and run saved actions.
- `Show History`: Review previous executions and results.
- `Create New Action`: Create or edit reusable actions.
- `Custom Action`: Run an ad-hoc instruction with configurable model, reasoning level, temperature, and max tokens.
- `Display Actions in Menu Bar`: Quick access to actions from the menu bar.

# 🎉 Features

### ⚡ Instant Results From Selected Text

Run actions directly on your current selection in Raycast and get live-streamed answers without breaking focus.

### 🧩 Reusable AI Actions

Build your own library of prompts as actions, edit them anytime, and keep your best workflows one shortcut away.

### 🧠 Multi-Model Flexibility

Choose the right model for the job across OpenAI and Gemini, including fast, lightweight, and premium options.

### 📊 Transparent Usage and Cost

Track input tokens, output tokens, total tokens, and estimated cost for every run.

### 🕘 Searchable History

Revisit previous outputs, compare results, and copy what you need from past executions in seconds.

### ⭐ Favorites and Fast Access

Pin your most-used actions, launch from menu bar, and integrate with Quicklinks for an even faster daily workflow.

### 🔄 Portable Action Library

Export and import actions to back up your setup or share proven prompts with your team.

# 🤖 Supported Models

## OpenAI 🧠

- `gpt-6-luna`
- `gpt-6.1-sol`
- `gpt-6-astra`
- `gpt-5.6-sol`
- `gpt-5.6-terra`
- `gpt-5.6-luna`
- `gpt-5.4`
- `gpt-5.4-mini`
- `gpt-5.4-nano`
- `gpt-4o`
- `gpt-4o-mini`

## Google Gemini ✨

- `gemini-3.8-flash`
- `gemini-3.6-flash`
- `gemini-3.5-flash-lite`
- `gemini-3.1-flash-lite`
- `gemini-3.1-pro-preview`
- `gemini-3-flash-preview`
- `gemini-2.5-flash`
- `gemini-2.5-flash-lite`

Built-in actions, new actions, and the initial Custom Action setting use `gpt-6-luna`. When saved actions load after the update, retired `gemini-3-pro-preview` selections are automatically changed to `gemini-3.1-pro-preview`. Other supported model selections and favorites are preserved.

Reasoning models have a `Reasoning Level` setting that controls how much thinking they do before answering. Higher levels can help with difficult tasks, but take longer and use more tokens. Saved action forms show this field only when the selected model supports it, with the levels available for that model. `Model Default` keeps the model's usual setting and is also used for existing actions without a saved level.

Configure Custom Action in Raycast Settings → Extensions → Alice AI → Custom Action. Models marked `(thinking)` in its model list support Reasoning Level. Both Reasoning Level and Temperature remain visible in Raycast Settings: models without thinking ignore Reasoning Level, and unsupported levels use Model Default. Temperature controls variation in wording from 0.0 to 1.0; OpenAI thinking models ignore it unless thinking is turned Off and the model supports that choice. Gemini models support temperature with thinking enabled.

Model availability: [OpenAI model catalog](https://developers.openai.com/api/docs/models), [Gemini model catalog](https://ai.google.dev/gemini-api/docs/models).

# 💸 Notes on Pricing

- Cost values shown in the UI are estimates derived from model-specific pricing rules.
- OpenAI and Gemini models use separate pricing tables, including long-context rates and dated Gemini promotions.
- Gemini pricing is based on the Gemini API pricing documentation.

# Development and Release

Use Node.js 22.22.2 or newer and install the locked dependencies with `npm ci`.

Run `npm run dev` to register or refresh the local extension in Raycast and watch for changes. This also registers new commands and refreshes manifest changes; `npm run build` alone does not refresh the registered manifest.

Before preparing a release, run:

```bash
npm test
npm run lint
npm run build
npm run bundle
```

The bundle is written to `release/alice-ai.rayext`. Build, lint, bundle, and publish scripts use the same project-installed Raycast SDK.

After reviewing and committing the changes, run `npm run publish` to submit the update to the Raycast extensions repository. The Store release follows Raycast review and merge. Use `{PR_MERGE_DATE}` for the new changelog entry so its date matches publication.

# 👤 About the Author

Alice AI is created by [Wojciech Król](https://github.com/wojciechkrol).
