# Claude Clean Paste

A Raycast extension that cleans up text copied from Claude Code terminal sessions — removes `❯` prompts, fixes line wrapping, and joins paragraphs into clean text.

## Commands

| Command | Description |
| --- | --- |
| **Paste Clean Claude Text** | Cleans clipboard text and pastes it into the frontmost app |
| **Clean Claude Text in Clipboard** | Cleans clipboard text in place (paste manually whenever you're ready) |

## What it cleans

- Strips leading `❯` prompt characters
- Joins soft-wrapped lines back into paragraphs
- Preserves paragraph breaks (blank lines)
- Collapses runs of extra whitespace

## Install

```bash
cd claude-clean-paste
npm install
npm run dev
```

This opens the extension in Raycast in development mode. From there you can assign hotkeys to either command.

## Credits

Inspired by Simon Willison's [cleanup-claude-code-paste](https://github.com/simonw/tools/blob/main/cleanup-claude-code-paste.html) browser tool.

Icon uses resources from [Lucide](https://lucide.dev/), licensed under the [ISC License](https://lucide.dev/license).
