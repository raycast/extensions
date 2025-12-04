# Invisible Text Detector

Remove hidden and problematic Unicode characters from any text. Detect zero‑width and control marks, visualize "non‑keyboard" typography (smart quotes, en/em dashes, ellipsis, NBSP), and normalize to safe ASCII when needed.

## Commands

- Open Invisible Text Detector: UI to paste/type text, see live analysis, reveal markers, and clean.
- Fix Invisible Characters: No‑view quick cleaner that operates on selected text or clipboard using your default mode.
- Analyze Clipboard for Invisible Characters: Shows a quick summary and copies a detailed report.

## Clean modes

- Only Invisible Characters: Removes zero‑width spaces/joiners, bidi controls, soft hyphen, BOM/ZWNBSP, grapheme joiner, variation selectors, and filler characters.
- All Unicode Characters: In addition to the above, converts visible typography to ASCII (smart quotes → straight quotes, en/em dash → hyphen, ellipsis → "...", NBSP → space, tabs → spaces), optionally normalizes NFKD and strips combining marks.

## Preferences

- Default clean mode for quick command, selected‑text vs clipboard preference, action after clean (copy or paste), toast summaries.
- Replacement toggles for All Unicode mode and preview defaults for the UI (Show Spaces, Show Non‑Keyboard, Show [U+XXXX]).

## Notes

- Nothing is sent over the network; all processing happens locally.
- Inspired by the analysis flow of [Originality.ai’s tool](https://originality.ai/blog/invisible-text-detector-remover).
