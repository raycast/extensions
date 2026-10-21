# Local AI

Run your own AI commands on selected text, with Apple's on-device model.

You don't have to copy your text into a chat window for simple things, and you don't need expensive API keys or subscriptions to do simple things your Mac can already do.

Fix grammar, change the tone or rewrite a sentence right where you type, in any app, without a separate writing assistant.

Local AI is built around commands you define. Write a prompt once, give it a name, and run it on whatever text you have selected. Give your favorite commands their own hotkeys.

## Custom commands and hotkeys

Open **AI Commands** to run, create, edit, pin, import and export commands. A command is a prompt, an icon, a creativity level and an output mode:

- **Replace**: from a hotkey, the result is pasted over your selection, and your clipboard is restored afterwards. With nothing selected, the result is copied to the clipboard instead. From **AI Commands**, the result opens in a window first, and **Paste to Active App** puts it over your selection.
- **Window**: the result opens in a window you can copy from.

To give a command its own hotkey:

1. In **AI Commands**, choose **Create Quicklink** on the command.
2. Open Raycast Settings, Extensions, Quicklinks, and assign a hotkey to the new Quicklink.

The first time a hotkey launches a command, Raycast asks you to confirm. Choose **Always Open** and it won't ask again.

Import and export use Local AI's own JSON format.

## Built-in commands

Local AI starts with these commands, which you can edit or delete:

- Make Professional
- Make Casual
- Make Friendly
- Make Shorter
- Make Longer
- Fix Spelling and Grammar
- Improve Writing
- Simplify
- Summarize
- Explain Simply
- Translate (asks for a target language)

## Placeholders

Use these in a command's prompt:

- `{selection}`: the selected text. If nothing is selected, the clipboard is used. Some apps, like code editors, don't share the selected text with Raycast. Turn on **Copy selection in apps that don't share it** in the extension's preferences to have Local AI copy it and restore your clipboard right after.
- `{clipboard}`: the current clipboard text.
- `{date}` and `{time}`: the current date and time.
- `{argument name="language" default="English"}`: asks you for a value when the command runs. Add `options="A, B, C"` to offer a fixed list. Up to three arguments per command.

## Setup

Local AI needs:

- macOS 27 on an Apple Silicon Mac
- Apple Intelligence turned on in System Settings
- The `fm` command line tool, with its license accepted: run `fm license` once in Terminal
- Accessibility permission for Raycast, so Local AI can read your selected text

Run **Check Setup** to see what is missing.

## Ask Local AI and Chat

**Ask Local AI** answers a quick question straight from the Raycast search bar.

**Chat with Local AI** keeps saved conversations. You can attach an image to a message.

## Privacy

Your text never leaves your Mac. Local AI makes no network calls and has no account, API key or telemetry.

## Limits

The on-device model handles about 4,096 tokens per request, and that includes its answer. It is best at rewriting, summarizing and extracting. Don't rely on it for facts, code or math. It has no web access.

## Feedback and contributing

Report bugs and share ideas in [GitHub issues](https://github.com/MatloobAltaf/local-ai-raycast/issues). Ideas are discussed there before anything gets built.

The source lives at [MatloobAltaf/local-ai-raycast](https://github.com/MatloobAltaf/local-ai-raycast). Pull requests are welcome there. See [CONTRIBUTING.md](CONTRIBUTING.md).

To run it locally:

```
npm install
npm run dev
npm test
npm run lint
```

Made by Matloob Altaf. Say hi at [matloob.pk](https://matloob.pk).
