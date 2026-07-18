# Text Scramble

**A humane alternative to Lorem Ipsum for decks, design drafts, and work in progress.**

Text Scramble turns selected copy into elegant invented language while protecting its visual footprint. It preserves spaces, punctuation, paragraph breaks, manual line breaks, word lengths, and casing, then chooses pronounceable replacements with a similar estimated width.

[![CI](https://github.com/bomkino/text-scramble/actions/workflows/ci.yml/badge.svg)](https://github.com/bomkino/text-scramble/actions/workflows/ci.yml)
[![MIT License](https://img.shields.io/badge/license-MIT-111111.svg)](LICENSE)

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
| Preferred Source | Selected Text     | Selected Text or Clipboard, with the other as fallback     |
| Output Action    | Replace Selection | Replace Selection or Copy to Clipboard                     |
| Scramble Numbers | On                | Replace decimal digits in place or leave numbers untouched |

## Privacy

Everything runs locally. The extension makes no network request, AI call, analytics event, or text-storage operation.

Structural anonymity has a deliberate tradeoff: word lengths, punctuation, repetition, and line structure remain visible because preserving them protects the layout. Text Scramble is draft anonymization, not cryptographic redaction.

## Install locally

Raycast and Node.js 22.22.2 or newer are required.

```bash
git clone https://github.com/bomkino/text-scramble.git
cd text-scramble
npm ci
npm run dev
```

Raycast imports the development extension. After the first import, the command remains available locally. If selection or paste access is blocked, allow Raycast under **System Settings → Privacy & Security → Accessibility**.

If you already have this repository checked out, run `npm ci` and `npm run dev` from its folder to load the latest version.

## Verify

```bash
npm test
npm run lint
npm run build
```

For a live paste check, open [tests/manual-smoke-test-source.txt](tests/manual-smoke-test-source.txt), select all, then run **Scramble Selected Text**. The three lines should retain their structure while the words and numerals change.

The extension is being prepared for the Raycast Store. Until it is accepted, the local installation above is the supported route.

## Project

- [Design and algorithm notes](docs/DESIGN.md)
- [Store submission checklist](docs/STORE_SUBMISSION.md)
- [Contributing](CONTRIBUTING.md)
- [Credits](ACKNOWLEDGEMENTS.md)
- [Security](SECURITY.md)
- [Changelog](CHANGELOG.md)

Released under the [MIT License](LICENSE).
