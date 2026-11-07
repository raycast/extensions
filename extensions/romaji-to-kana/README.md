# Romaji to Kana

A Raycast extension to retype accidentally typed romaji text into Japanese Kana without deleting it.

![Type nihongo, select it, and press a hotkey to retype it as 日本語, then press Return to confirm](media/romaji-to-kana-demo.gif)

## Requirements & Prerequisites

> [!IMPORTANT]
> This extension is specifically designed for **macOS Japanese IME** with an **Apple JIS Keyboard** (featuring the dedicated "Kana" [かな] key, key code 104).

- **Keyboard Layout**: Apple JIS Keyboard with dedicated "Kana" key
- **Input Source**: macOS default Japanese Input Source (Romaji input)
- **macOS Permissions**:
  - **System Settings -> Privacy & Security -> Accessibility** -> Raycast (to send keystrokes and read selected text)
  - **System Settings -> Privacy & Security -> Automation** -> Raycast -> **System Events**

## How to Use

1. Select text you accidentally typed in English/Alphanumeric mode (e.g., `nihongo`).
2. Run the `Retype Selection as Kana` command (assigning a global hotkey is recommended; the demo uses `⌃⇧K`).
3. The selected text is replaced in Japanese Kana mode, remaining unconfirmed so you can hit Space to convert into Kanji or Return to confirm.

## How It Works

- Reads the selected text using Raycast's `getSelectedText()`.
- Sends the "Kana" key (key code 104) via System Events to switch the input mode to Japanese Kana.
- Retypes the original keys using `keystroke`. The first keystroke overwrites the selected text.

| Scenario | Behavior |
| --- | --- |
| No text selected | Shows HUD: "Please select text" |
| Contains whitespace (space, tab, newline) | Shows HUD warning (whitespace triggers IME conversion or focus changes) |
| Contains non-ASCII characters (full-width, kana, kanji) | Shows HUD warning without sending keystrokes |
| Permission missing | Shows HUD prompting to check System Settings permissions |

## Limitations

- Only ASCII characters without whitespace are supported for retyping (to avoid triggering IME conversion or focus changes).
- Terminal emulators that do not overwrite selection on typing are not supported.
