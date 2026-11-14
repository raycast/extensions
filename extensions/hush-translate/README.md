<p align="center">
  <img src="media/icon.png" width="128" height="128" alt="Hush Translate icon: a smiling speech bubble made of glass on a sky-blue tile">
</p>

<h1 align="center">Hush Translate</h1>

A [Raycast](https://www.raycast.com/) extension that translates with the Apple Intelligence model on your Mac. There is no account and no API key, it works offline, and the text you translate never leaves the device.

## Requirements

- A Mac with Apple silicon
- macOS 26 or later
- Apple Intelligence turned on in System Settings

## Commands

| Command                  | What it does                                                          |
| ------------------------ | --------------------------------------------------------------------- |
| **Translate**            | Type text and press Return.                                           |
| **Translate Clipboard**  | Translates what is on the clipboard. An image is read with OCR first. |
| **Translate Selection**  | Translates the text selected in the frontmost app.                    |
| **Translate Screenshot** | Select an area of the screen; the text in it is read and translated.  |

The source language is detected automatically. The language menu in the search bar sets the target. Text that is already in that language is translated into your fallback language instead, so one command covers both directions.

On a result, Return copies the translation and ⌘Return pastes it into the frontmost app. ⌘T translates the same text into another language.

## Languages

简体中文, 繁體中文, English, 日本語, 한국어, Français, Deutsch, Español, Italiano, Português, Nederlands, Svenska, Dansk, Norsk, Türkçe, Tiếng Việt.

## Preferences

- **Translate into**: the language you usually translate into.
- **Fallback Language**: used when the text is already in that language.
- **Copy every translation automatically**: off by default.

## Privacy and limitations

- Everything runs on the Mac: the model, the OCR and the history. Nothing is sent over the network.
- Long text is translated paragraph by paragraph, because the on-device model reads a limited amount of text at once. The translation grows as each paragraph finishes.
- Apple Intelligence can decline some content. When it does, the extension says so.
