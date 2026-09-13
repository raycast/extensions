# AI Commands (Bring Your Own Key)

Raycast extension. Run AI on selected text with your own OpenAI or Anthropic key.
Select text anywhere, hit a hotkey, review the result, press Enter to replace it.

## What you get

- **Presets** in root search: Fix Spelling and Grammar, Improve Writing, Rewrite, Clean Text, Make Shorter, Make Longer, Summarize, Explain This.
- **Your own commands**: any prompt, per-command provider and model, and a choice of what happens when done (preview and paste on Enter, paste right away, or copy).
- **Inline highlights**: new or changed words are bold in the result, so you see what the model did. Pasting always uses the plain text.
- **Import from Raycast**: bring your old Raycast AI Commands over from an "Export Settings & Data" file in one go.

## Setup

1. Open the extension preferences (`⌘ ,` on any command).
2. Paste your OpenAI key, your Anthropic key, or both.
3. Set a default model per provider. Any command can override it.

## Writing a prompt

Put `{selection}` where the selected text should go:

```
Fix spelling and grammar. Reply with the corrected text only.

Text:
{selection}
```

Without `{selection}`, the prompt is sent as instructions and the text follows it.
`{clipboard}` and `{argument default="…"}` from Raycast prompts work too.

## Hotkeys

Presets are normal commands: give them a hotkey in Raycast settings.
For a command you created or imported, pick it in **Search AI Commands** and choose
**Create Quicklink for Hotkey**. The quicklink shows up in root search and takes a hotkey.

## Privacy

Keys are stored by Raycast on your Mac. Selected text goes only to the provider you
chose for that command. If Raycast cannot read the selection in an app, the extension
uses the clipboard instead and says so.

## Development

```
npm install
npm run dev
```
