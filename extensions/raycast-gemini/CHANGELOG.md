# Google Gemini Changelog

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
