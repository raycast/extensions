# Grok Bots Changelog

## [Windows Support] - {PR_MERGE_DATE}

- Added Windows support: Bots are read from `%APPDATA%\Grok Bot`.
- Auto-send works on Windows: it brings Grok Bot to the front, checks the message box through UI Automation, and presses Enter (or Ctrl+Enter), with the same "only send your exact prompt" safeguard as on macOS.
- Webhook and Quicklink shortcuts use Ctrl+Shift on Windows.

## [Initial Version] - 2026-11-27

- Chat with Grok Bot: pick one of your Grok Bots from a searchable list and send it a prompt.
- Each Bot shows a preview of its latest message, and ⌘Y opens a panel with the Bot's recent chat.
- Sort Bots by most used, latest activity, Grok Bot's sidebar order (with its sections), or name.
- Sends through Grok Bot's prompt links, and can press Return for you once the prompt is in the message box (auto-send).
- Optional routine webhooks per Bot send prompts in the background without opening Grok Bot.
- Create a Quicklink for any Bot, open its chat, or copy its ID.
