# Text Scramble — Design Notes

## Goal

Create presentation-safe draft copy that hides original wording without damaging layout or looking like default filler.

## Scrambling model

1. Keep every non-letter and non-number character untouched. Spaces, tabs, punctuation, emoji, paragraph breaks, and manual line breaks remain byte-for-byte equivalent.
2. Keep each word’s exact letter count and uppercase/lowercase pattern.
3. Generate many pronounceable invented candidates from restrained vowel, consonant, and consonant-cluster rules.
4. Score candidates against a font-agnostic glyph-width model. Pick closest visual shape, with extra weight on total word width.
5. Reject common English words, source matches, harsh letter runs, repetitive bigrams, and unwelcome fragments.
6. Reuse one invented base word when a source word repeats inside the same selection.
7. Scramble every decimal digit by default while preserving its writing system, digit count, and separators. Leave non-decimal numeric symbols untouched when shape-safe substitution is unavailable.

## Acceptance criteria

- Output is plain text.
- Original whitespace, punctuation, line breaks, token lengths, and case patterns are preserved.
- Repeated words stay visually consistent inside one selection.
- Sample deck lines remain within 5.5% of estimated source width.
- No network request, AI service, telemetry, or text storage.
- Default action replaces current selection; clipboard-only mode remains available.

## Deliberate limit

Manual line breaks are exact. Automatic wrapping can only be close, never pixel-perfect: font, tracking, kerning, OpenType features, and application shaping all affect final measure. Word length plus width scoring gives strong practical fidelity without requiring access to Figma or InDesign typography internals.
