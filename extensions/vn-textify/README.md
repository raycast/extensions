# Vietnamese Telex Transformer

Stop fighting your keyboard. Type freely, transform instantly.

If you type in both Vietnamese and English, you know the struggle — constant IME switching, accidental transforms in English text (`catcher` → `cảtche`, `user` → `ủe`), and mental overhead. This extension lets you stay in your English keyboard and transform selected Telex text into proper Vietnamese with one hotkey.

```
Input:  tooi ddang hocj code, fix bug status cho user
Output: tôi đang học code, fix bug status cho user
```

## Features

- **Free-flow typing.** No keystroke interception. Type Telex in any language mode.
- **Smart syllable validation.** Full Vietnamese syllable parsing rejects English words automatically (`catcher`, `teacher`, `you`, `search`).
- **Diacritic-only vowel pairs.** `ue`, `ye`, `ei`, `eu`, `uu` only valid with diacritics — `user` stays `user`, `yes` stays `yes`.
- **Punctuation-aware.** Tone markers before trailing punctuation are correctly consumed (`tanf,` → `tàn,`).
- **Zero dependencies.** Pure JavaScript, no network, no tracking.
- **Reusable engine.** `telex.js` runs anywhere — Electron, Tauri, browser extension, CLI.

## Quick Start (Raycast)

```bash
git clone <repo>
npm install
# In Raycast → Extensions → Import Extension → select this folder
# Assign hotkey: Cmd+Option+V
```

Select Telex text → press hotkey → transformed in place.

## Known Limitations

English words that form valid Vietnamese syllables need skip-words:

| Input  | Output | Fix                              |
| ------ | ------ | -------------------------------- |
| `mix`  | `mĩ`   | `telexTransform(text, ["mix"])`  |
| `core` | `cỏe`  | `telexTransform(text, ["core"])` |

Pass a skip-word list to `telexTransform(text, ["mix", "core"])`; entries match as prefixes (e.g. `"mix"` skips `mix`, `mixer`).

## License

MIT
