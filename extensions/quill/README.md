# Quill

Fix grammar, rephrase text and copy text from screenshots with Apple Intelligence. Everything runs on-device through Apple's Foundation Models: no API keys, no accounts, and your text never leaves your Mac.

## Commands

| Command | What it does |
| --- | --- |
| **Fix Grammar** | Corrects spelling and grammar in the selected text and replaces it in place. |
| **Rephrase** | Rewrites the selected text with different words. Press Enter to replace the selection, or copy the result. Pick a tone (professional, casual, friendly, formal, concise) with `⌘T`; the last one you picked is remembered, and the command's preferences set the starting tone. |
| **OCR Screenshot** | Select a region of the screen and copy the text in it to the clipboard. |

Quill detects the language of your text and answers in the same language; it never translates.

## Requirements

- **macOS 26 (Tahoe) or later.** The extension is macOS-only and relies on the `fm` command-line tool that ships with macOS 26.
- A Mac that supports **Apple Intelligence**, with Apple Intelligence turned on in System Settings.

## First run

The first time you use a command, macOS asks you to accept Apple's Foundation Models terms. Quill opens the prompt in Terminal so you can answer it yourself; after that, run the command again.

**OCR Screenshot** also needs Screen Recording permission for Raycast (System Settings → Privacy & Security → Screen & System Audio Recording). Quit and reopen Raycast after enabling it.
