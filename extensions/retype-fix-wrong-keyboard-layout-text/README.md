# Retype

Fix text that you typed in a wrong keyboard layout and switch to the correct layout.

`ghbdtn` → `привет`, `руддщ` → `hello`, `ghsdbnfyyt` → `прывітанне`.

## How to use

1. Assign a hotkey to **Correct Text Typed in Wrong Keyboard Layout** in Raycast Settings → Extensions → Retype. We recommend <kbd>⌥</kbd> <kbd>⌥</kbd> (press Option two times).
2. Select the text. If you select nothing, Retype selects from the cursor to the start of the line.
3. Press the hotkey.
4. Retype types the fixed text over the selection and switches your keyboard to the correct layout.

If Retype detects a wrong layout, switch to the correct layout and press the hotkey again.

If you select nothing, the first time macOS can ask you to let Raycast control System Events. Click **OK**. Retype uses System Events to select the line.

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
