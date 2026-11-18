# Text Scramble

**A humane alternative to Lorem Ipsum for decks, design drafts, and work in progress.**

Text Scramble turns selected copy into elegant invented language while protecting its visual footprint. It preserves spaces, punctuation, paragraph breaks, manual line breaks, word lengths, and casing, then chooses pronounceable replacements with a similar estimated width.

## Use

1. In Figma, InDesign, Keynote, or another app, enter text-editing mode and select the actual characters.
2. Open Raycast and run **Scramble Selected Text**.
3. The selection is replaced with scrambled plain text.

For a one-keystroke workflow, assign the command a hotkey in **Raycast Settings → Extensions → Text Scramble**.

## What it protects

- Exact whitespace, punctuation, paragraphs, and manual line breaks
- Exact letter and decimal-digit counts at every position
- Original numeral writing system, including fullwidth, Arabic-Indic, and Devanagari digits
- Exact uppercase and lowercase pattern
- Similar estimated word and line measure
- Consistent replacements for repeated words within one selection
- Soft, readable rhythm without obvious English words or jarring fragments

Automatic wrapping remains an approximation. Font metrics, tracking, kerning, OpenType features, and application shaping can all move a line slightly.

## Preferences

| Preference       | Default           | Options                                                    |
| ---------------- | ----------------- | ---------------------------------------------------------- |
| Preferred Source | Selected Text     | Selected Text or Clipboard; fallback only when readable and empty |
| Output Action    | Replace Selection | Replace Selection or Copy to Clipboard                     |
| Scramble Numbers | On                | Replace decimal digits in place or leave numbers untouched |

**Replace Selection** restores supported plain-text and HTML clipboard contents after pasting. If Raycast cannot safely reproduce a file-bearing or unsupported rich clipboard state, Text Scramble stops before changing either the selection or clipboard. Transient restoration failures are retried; a persistent macOS pasteboard failure is reported with a Clipboard History recovery path.

## Privacy

Everything runs locally. The extension makes no network request, AI call, analytics event, or text-storage operation.

Structural anonymity has a deliberate tradeoff: word lengths, punctuation, repetition, and line structure remain visible because preserving them protects the layout. Text Scramble is draft anonymization, not cryptographic redaction.

If selection or paste access is blocked, allow Raycast under **System Settings → Privacy & Security → Accessibility**.

## Credits

Text Scramble’s selected-text and clipboard fallback, plus its paste-or-copy interaction model, was inspired by Eric (`erics118`) and the contributors to Raycast’s open-source [Change Case](https://www.raycast.com/erics118/change-case) extension.

No Change Case source code is bundled or copied. The MIT-licensed interaction pattern was studied and then implemented for Text Scramble’s distinct purpose.

Built on the [Raycast API](https://developers.raycast.com/) and its open extension ecosystem. Designed and maintained by [pitch.dog](https://pitch.dog/), with development support from OpenAI Codex.
