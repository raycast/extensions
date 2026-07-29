# Quick Quote

Highlight text, run the command, get a Markdown blockquote pasted back.

Primary use case: quote CLI agent output and paste it into the next prompt.

## Usage

1. Select text in any app.
2. Trigger **Quick Quote** from Raycast.
3. The selection is pasted back with `> ` prefixed on every line.

Your original clipboard is restored afterward.

## Where it works best

- **Terminals.** Select agent output (Claude Code, Codex, and friends), run the command, and the quote lands at your prompt, ready for the next message. Terminals that auto-copy on select are handled.
- **Anywhere Markdown renders.** GitHub comments, Slack, Notion, Linear, email drafts.

## Where it doesn't

- **Password fields and secure inputs.** macOS blocks synthetic keystrokes while secure input is active, so neither read path can run. That is a macOS security feature, not a bug.
- **Non-text selections.** Images, files, and other non-text content can't be quoted.
- **Rich text.** The pasted quote is plain text; styling from the original is not preserved.

## Requirements

Raycast needs macOS Accessibility permission. Grant it in **System Settings → Privacy & Security → Accessibility**. Both read paths depend on it: the Accessibility API read and the `Cmd+C` keystroke fallback.

## How it reads the selection

Most apps: via the macOS Accessibility API.

Terminals and other apps that block AX: falls back to `Cmd+C` and reads the clipboard. Terminals that auto-copy on select are handled correctly.

## Development

```bash
npm install
npm run dev
```

Open Raycast, search for "Quick Quote", and press Enter to run.

## Publishing

```bash
npm run publish
```

Requires `npm` — the Raycast Store validates `package-lock.json`.
