# Claude Writing Assistant

Translate, fix and rewrite the text you select in any app, ask questions, read screenshots and summarize web pages with Claude, using your own Anthropic API key.

## Setup

1. Create an API key in the [Claude Console](https://console.anthropic.com) under **API Keys**.
2. Open any command of this extension. Raycast asks for the key and your **Second Language**.
3. Optional: set your **Primary Language**, the models and other options in the extension preferences.

## Commands

| Command | What it does |
| --- | --- |
| **Translate and Replace** | Translates the selection in place without opening Raycast. Text in your primary language goes to your second language; any other language goes to your primary language. Best with a hotkey. |
| **Translate to Language** | Translates the selection into a language you pick and replaces it. |
| **Fix Spelling and Grammar** | Fixes spelling, grammar, punctuation and missing accents with minimal changes, in place. |
| **Improve Writing** | Makes the selection clearer and more fluent without changing its language or meaning. |
| **Change Tone** | Rewrites the selection as professional, friendly, formal, confident, concise, diplomatic, empathetic, persuasive or playful. |
| **Edit with Instruction** | Applies your own instruction ("make it a bulleted list", "convert to JSON") to the selection. |
| **Translate** | Translates as you type, adds a dictionary entry for single words, reads text aloud and supports suffixes such as `>de` to pick a language. |
| **Translate Selection** | Opens Translate with the selected text already translated, or empty when nothing is selected. Best with a hotkey. |
| **Ask Claude** | Chats with Claude, searching the web and listing sources when an answer needs current information. Works as a fallback command too. |
| **Ask About Selection** | Asks a question about the selected text and keeps the conversation going. |
| **AI Commands** | 19 built-in commands (summarize, draft a reply, write a commit message, regex, shell commands, localization files…) plus your own. Create a quicklink for any of them to give it a hotkey. |
| **Translate Screen Area** | Translates the text inside an area of the screen you select. |
| **Ask About Screen Area** | Asks Claude about an area of the screen you select. |
| **Copy Text from Screen** | Copies the text inside an area of the screen you select. |
| **Summarize Web Page** | Summarizes the current browser tab and answers follow-up questions. Needs the [Raycast browser extension](https://www.raycast.com/browser-extension). |
| **Search Conversations** | Picks up earlier chats where you left off. |
| **Search Edit History** | Keeps the original of every edit, so you can paste it back. |
| **Show Usage and Cost** | Shows tokens and estimated spending by day, week, month and model. |

## Tips

- Give **Translate and Replace**, **Translate Selection** and **Fix Spelling and Grammar** a hotkey in Raycast Settings → Extensions to use them from anywhere in one keystroke.
- For the fastest in-place edits, choose Claude Haiku 5.5 as **Model for Quick Edits**.
- If nothing is selected, the clipboard text is used and the result is copied back to the clipboard. After pasting over a selection, your previous clipboard content is restored.

## Privacy and Costs

- Your API key is stored in Raycast's encrypted preferences. Text is sent only to the Anthropic API.
- Conversations, the edit history and usage counters stay on your Mac.
- Costs are estimated from the usage the API reports and list prices; your actual bill is in the Claude Console. Web searches cost about $0.01 each.
- Requests to Claude Opus 5.5, Claude Sonnet 5.5 and Claude Fable 5.1 opt into Anthropic's server-side fallback: if a safety classifier declines a request by mistake, it is retried on the model Anthropic recommends for that case.
