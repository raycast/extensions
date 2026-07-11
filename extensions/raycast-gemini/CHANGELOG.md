# Google Gemini Changelog

## [AI Chat UX & Naming Improvements] - 2026-04-03

- 💬 Make `Enter` send messages in AI Chat instead of copying the current answer.
- ⚙️ Add shared `System Prompt`, default `Model`, and `Title Model` preferences for the `AI Chat` command.
- 🆕 Remove the chat creation form and start new chats immediately from the main AI Chat view.
- 🏷️ Automatically generate a chat title from the first user prompt with a lightweight model.
- 🧭 Reuse the existing empty draft chat instead of creating multiple blank conversations.

## [TypeScript Migration & Model Updates] - 2026-03-16

- 🛠️ Migrated entire codebase from JSX to TypeScript (TSX/TS) for improved type safety.
- ⬆️ Updated `@google/genai` SDK from ^1.37.0 to ^1.44.0.
- 🆕 Updated model list: removed deprecated models, added Gemini 3.1 Pro.
- 🔧 Set default model to Gemini 2.5 Flash.
- 🐛 Fixed streaming bug in AI Chat regeneration (`result.stream` → `result`).

## [Fix copy actions in AI Chat] - 2026-03-07

- 🐛 Fix: enable “Copy Answer”, “Copy Prompt”, and “Copy Entire Chat (Transcript)” actions for the selected message.

## [New models & SDK Migration] - 2026-01-19

- 🆕 New Model: Gemini 3.0 Flash
- 🆕 New Model: Gemini 3.0 Pro
- 🛠️ Migrated to the official TypeScript/JavaScript SDK for Gemini and Vertex AI. (`@google/genai`)
- ⚠️ Removed pre-Gemini 2.0 models, due to lack of support.

## [Maintenance] - 2026-01-01

- 🪟 Add support for Windows platform.
- ⬆️ Bump all dependencies to the latest.

## [Update Models] - 2025-08-04

- ⬆️ Update Gemini 2.5 series models from preview to production ready versions.

## [Add Safety Settings] - 2025-07-03

- 🛡️ Now users can set their safety filtering options as they need.
- 🐛 Fix a bug in AI chat

## [New Model] - 2025-05-14

- 🆕 New Model: Gemini 2.5 Pro Preview 0506

## [New Model] - 2025-04-25

- 🆕 New Model: Gemini 2.5 Flash Experimental

## [New Model and Code Improvements] - 2025-03-26

- 🆕 New Model: Gemini 2.5 Pro Experimental
- 🛠️ Code Improvements: show error messages, and add new error code handling

## [Fix Create Chat Functionality] - 2025-03-24

- 🛠️ aiChat - Fixed the issue where the "Create Chat" functionality always set the chat name to "New Chat X" instead of using the name provided by the user.
  - Updated the `CreateChat` component to use the chat name provided by the user. If the user does not provide a chat name, the `createNewChatName` function is used as a fallback.
  - Added validation to ensure that the chat name is unique and not blank.

## [Updated Models] - 2025-03-15

- ⬆️ Upgrade the Gemini 2.0 Flash from preview to release
- ⚠️ Add alerts to models that will be deprecated in Sep 2025

## [New Command] - 2025-03-12

- 🆕 New Command: Command History: now you can 📜 view your command history.

## [New Command] - 2025-03-10

- 🆕 New Command: Ask About Selected Screen Area

## [New Models and Features] - 2025-02-24

- 🤖 Update model variants
- ⚙️ Set default model to Gemini 2.0 Flash which is already production ready
- 🙋 Support custom model names as a supplement for listed common models.

## [Append Selected Text to Chat] - 2025-02-04

- Ability to append selected text to the chat command with the `Append to Chat` command. Shortcut: `Ctrl + Shift + V`

## [Improved Translate Command] - 2025-01-17

- 🔄 Translate Selected Text: now you can set first and second target language.
  - All languages are by default translated to first target language.
  - First target language is translated to second target language.
  - Force Target Language overrides first target language.

## [Gemini Flash 2.0 and More Customization] - 2025-01-02

Features:

- 🆕 Add new Models for Gemini 2.0 Flash Experimental, Gemini Experimental 1206, Gemini 2.0 Flash Thinking Experimental and LearnLM 1.5 Pro Experimental
- 🧹 Allow prompts to be customizable in Raycast Settings
- 🗯️ Add ability to add a default Translate language, and also ability to override with a parameter

## [Add Translate Command] - 2024-09-02

More Features:

- 🔄 Translate Selected Text: Translate the selected text to any language!

## [Gemini 1.5 Update] - 2023-05-25

Experience speed and performance together like never before with the brand new Gemini 1.5 Flash and Gemini 1.5 Pro models. Powered by [Gemini AI v2](https://github.com/evanzhoudev/gemini-ai), Gemini for Raycast is more powerful than ever before.

More Features:

- 🗃️ Customize what models each Quick AI command uses, in Extension Preferences, or choose a default to use.
- 💬 AI chat now allows each individual command to use a different model!

Fixes:

- 🚨 Gemini for Raycast now alerts you when you've hit your rate limit differently than other errors
- 🖋️ AI Chats are now automatically named with "New Chat" followed by a number
- ⛓️ Streaming now relies on SSE, for faster and more efficient data transfer (Enabled by Gemini AI v2)

## [Ask About Screen & More!] - 2023-01-13

Ask about what's on your screen right now with the new `Ask About Your Screen` command!

More Features:

- 🔍 Ask About Selected Text: Give AI a custom instruction about your selected text!
- 📩 Send to Chat: Go from your Quick AI prompts straight to a new chat!
- 🔄 Fallback Command Support: Add Gemini to your fallback arsenal!

Fixes:

- 📋 Copying text now has a dedicated shortcut, instead of ⌘Enter
- 📝 "Quick AI" is now "Ask AI", to match Raycast AI
- 🌟 New Material Icons for commands
- 🖋️ Better descriptions for commands

## [Initial Version] - 2023-01-06

Still staying true to the concepts of the original Bard and PaLM extensions, Gemini for Raycast has been completely rewritten and remade from the ground up to be optimized for Gemini.

> Powered under the hood by my custom [Gemini AI](https://github.com/evanzhoudev/gemini-ai) library

Features:

- ⛓️ Streaming support
- ⚡ Quick AI
- 💬 Chat Command
- 🖼️ Multimodal Support (input images)
- ✨ And more!
