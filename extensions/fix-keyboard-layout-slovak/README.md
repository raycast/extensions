# Fix Keyboard Layout (Slovak)

Typed a sentence with the wrong keyboard layout active? Select it, run the command and the text is fixed in place.

| You typed (English layout) | You get (Slovak layout) |
| --- | --- |
| `Ahoj ako sa m83, Ma5a m8 nov0 m]so` | `Ahoj ako sa máš, Maťa má nové mäso` |
| `+dakujem, =Ostrava` | `ďakujem, Óstrava` |

It works the other way too: `it§s fine_` → `it's fine?`.

## Commands

- **Fix Keyboard Layout** – detects the direction automatically. Text with Slovak-only characters (diacritics, `§`, …) is converted to English, anything else to Slovak.
- **Convert English Layout to Slovak** – always EN → SK.
- **Convert Slovak Layout to English** – always SK → EN.
- **Preview Keyboard Layout Conversion** – type or paste text (or start with the current selection) and see both conversions side by side; the detected one is marked. Paste or copy the result.

Assign a hotkey to **Fix Keyboard Layout** for the fastest workflow: select text → press the hotkey.

## How it works

The text is turned back into the keys you pressed on the source layout and replayed on the target layout, so Shift combinations (`@` → `2`, `<` → `?`) and Slovak dead keys (`´` and `ˇ`: `+d` → `ď`, `=o` → `ó`) are handled. Key maps come from the macOS layouts **ABC / U.S.**, **Slovak – QWERTY** and **Slovak (QWERTZ)**.

## Preferences

- **Slovak Layout** – QWERTY (default) or QWERTZ (Y and Z swapped).
- **Keep standalone numbers unchanged** – `2025` or `10.5` stay as they are (on).
- **Convert clipboard when nothing is selected** – converts the clipboard and copies the result back (on).
