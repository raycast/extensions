# Vision OCR

Copy text from anywhere on your screen with Apple's on-device Vision framework, the same engine behind Live Text.

- **Nothing to install.** No Tesseract, no Homebrew, no models to download. Vision ships with macOS.
- **Fast and idle when not in use.** Each run starts a small native helper, recognizes the text (about 0.3 s on Apple silicon) and exits. Nothing stays in memory between runs.
- **Private.** Recognition runs entirely on your Mac.
- **Keeps the layout.** Line breaks, paragraph gaps and code indentation come through as they look in the image.

## Commands

| Command | What it does |
|---|---|
| Recognize Text | Select an area of the screen (press Space to pick a window) and copy its text |
| Recognize Text in Clipboard | Copy the text from the image or PDF on the clipboard |
| Recognize Text in Selected File | Copy the text from the images or PDFs selected in Finder |

Assign a hotkey to **Recognize Text** in Raycast settings for one-keystroke capture.

## Formats

Choose one under **Format** in the extension's settings.

| Format | Result |
|---|---|
| Keep Line Breaks (default) | Lines as in the image, a blank line between paragraphs, indentation kept |
| Join Lines into Paragraphs | Wrapped lines joined and hyphenation undone, so text pastes cleanly into documents. List items stay on their own lines |
| Single Line | Everything on one line |
| No Spaces | All whitespace removed, for serial numbers and codes |
| Links Only | Each URL on its own line, including links that wrap across lines and QR codes |
| Email Addresses Only | Each email address on its own line |

## Preferences

- **After Recognition**: copy to the clipboard, append to what's already there (to collect text from several places), or paste into the active app.
- **Language**: Automatic works for most Latin-script text. Pick a language for Chinese, Japanese, Korean, Arabic, Thai and other scripts.
- **Recognition**: Accurate (default) or Fast. Fast is about 3× quicker but supports only English, French, German, Italian, Portuguese and Spanish.
- **Custom Words**: names and jargon to prefer, separated by commas.
- **Correct spelling**: on by default. Turn it off for code, serial numbers and random strings.
- **Keep indentation**, **Use plain punctuation** (straight quotes and hyphens for terminals and code editors), **Read QR codes and barcodes**.

## Permissions

The first time you run **Recognize Text**, macOS asks you to allow Raycast to record the screen. Turn on Raycast in System Settings → Privacy & Security → Screen & System Audio Recording, then run the command again.

## Adding a format

Formats live in [`src/lib/format.ts`](src/lib/format.ts). Add a function to `FORMATS`, its id to `FORMAT_IDS`, and a matching dropdown entry in `package.json`.
