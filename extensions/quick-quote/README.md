# Quick Quote

Highlight text, run the command, get a Markdown blockquote pasted back.

Primary use case: quote CLI agent output and paste it into the next prompt.

## Usage

1. Select text in any app.
2. Trigger **Quick Quote** from Raycast (or your hotkey).
3. The selection is pasted back with `> ` prefixed on every line.

Example: `hello` becomes:

```
> hello
```

Your original clipboard is restored afterward.

This is a no-view command, so a hotkey quotes without opening Raycast. Recommended hotkey: `✦` (Caps Lock) + `C`. Set it in Raycast → Settings → Extensions → Quick Quote. Caps Lock as Hyper is a common remapping (e.g. via Karabiner-Elements); pick any free combo if you use something else.

## Where it works best

- **Terminals.** Select agent output (Claude Code, Codex, and friends), run the command, and the quote lands at your prompt, ready for the next message. Terminals that auto-copy on select are handled.
- **Anywhere Markdown renders.** GitHub comments, Slack, Discord, Notion, Linear, email drafts.

## Where it doesn't

- **Password fields and secure inputs.** macOS blocks synthetic keystrokes while secure input is active, so neither read path can run. That is a macOS security feature, not a bug.
- **Non-editable surfaces.** The quote is pasted back where keyboard focus is. Selecting text on a web page or in a PDF viewer can be read, but there is no text box to receive the paste, so nothing happens.
- **Non-text selections.** Images, files, and other non-text content can't be quoted.
- **Rich text.** The pasted quote is plain text; styling from the original is not preserved.

## Requirements

Raycast needs macOS Accessibility permission. Grant it in **System Settings → Privacy & Security → Accessibility**. Both read paths depend on it: the Accessibility API read and the `Cmd+C` keystroke fallback.

## How it reads the selection

Most apps: via the macOS Accessibility API.

Terminals and other apps that block AX: the command sends `Cmd+C` itself and reads the clipboard. It checks the macOS pasteboard change count around that keystroke and only quotes text the keystroke actually copied, so a stale clipboard (say, a password copied earlier) is never pasted. Terminals that auto-copy on select work too, because they re-copy the selection on `Cmd+C`.
