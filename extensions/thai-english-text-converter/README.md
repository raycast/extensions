# Thai-English Text Converter

Fix text typed with the wrong keyboard layout — instantly convert between Thai and English.

Ever start typing before switching your keyboard language? You meant `สวัสดี` but got `l;ylfu`, or meant `hello` but got `้ำสสน`. This extension fixes it in one keystroke — no retyping, no translation, fully offline.

## How it works

Each character is remapped to the key at the **same physical position** on the other layout (Thai **Kedmanee** ↔ **QWERTY**). It's a pure key-position remap, not a translator, so it recovers whatever the wrong layout produced.

Direction is auto-detected: if the text contains Thai characters it converts Thai → English, otherwise English → Thai.

## Usage

1. Select the mis-typed text (or copy it to the clipboard).
2. Run the **Convert Text** command from Raycast.
3. The corrected text is pasted back — replacing the selection, or at your cursor when read from the clipboard.

A HUD confirms the result (e.g. `✅ Converted selection to Thai`).

## Examples

| You typed (wrong layout) | Converted |
| ------------------------ | --------- |
| `l;ylfu`                 | `สวัสดี`  |
| `4kKkwmp`                | `ภาษาไทย` |
| `้ำสสน`                  | `hello`   |
| `แฟะ`                    | `cat`     |

## Notes

- Based on the **Kedmanee** Thai layout (the macOS/Windows default).
- Direction is detected by character range, so running it on text that is _already correct_ will convert it anyway (a valid English word becomes Thai gibberish, and vice versa). Use it only on mis-typed text.
- Runs entirely offline — no data leaves your machine.
