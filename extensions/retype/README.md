# Retype

Fix text that you typed in a wrong keyboard layout and switch to the correct layout.

`ghbdtn` → `привет`, `руддщ` → `hello`, `ghsdbnfyyt` → `прывітанне`.

## How to use

1. Select the text. If you select nothing, Retype selects from the cursor to the start of the line.
2. Run **Retype in Correct Layout**. Assign a hotkey for best results.
3. Retype pastes the fixed text and switches your keyboard to the correct layout.

## Features

- **Automatic layout detection.** You do not configure language pairs. Retype finds the layout that the text was typed in.
- **Works with any macOS keyboard layout** that you enabled, including custom `.keylayout` files: Russian, Ukrainian, Belarusian, Greek, Hebrew, Arabic, Georgian, Armenian, Thai, German, French AZERTY, and more.
- **More than 2 layouts.** Retype prefers the layouts you used before and skips targets that give the same text.
- **Option-layer characters** are mapped too.

An alternative to Punto Switcher for macOS and Raycast.

## Limitations

- Input methods (IMEs) are not supported: Chinese, Japanese, Korean. They have no fixed key map.
- Characters typed with dead keys (for example `^` then `e`) are not mapped.
- Keys that type more than one character (ligatures, some tone marks) are not mapped.
- You need at least 2 keyboard layouts.

## How it works

Retype reads the key maps of your enabled keyboard layouts from macOS. It scores each layout by how many characters of the selected text it contains, then maps each character to the same physical key in the target layout.
