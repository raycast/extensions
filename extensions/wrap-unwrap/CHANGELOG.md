# Wrap Unwrap Changelog

## [Strip Bullet Indentation] - 2026-05-16

- Add **Unwrap Text** preference **Strip Bullet Indentation** — re-indents bullet and numbered lists to a fixed 2-space-per-level step, removing the leading spaces that pasted terminal or rich-text content adds in front of markers. Nesting depth is preserved by relative indent order. Off by default.
- Recognize common Unicode bullet markers (`•`, `‣`, `▪`, `▸`, `–`, `—`) as list items so pasted rich-text and terminal output reflows correctly.
- Fix inline-token placeholder restore: a code span immediately followed by digits (e.g. `` `foo`42 ``) no longer drops the span and digits.

## [Initial Version] - 2026-05-10

- Add **Wrap Text** command — wrap text at a configurable column width with Markdown awareness.
- Add **Unwrap Text** command — reflow wrapped text into continuous paragraphs, preserving Markdown structure.
- Shared preferences: Preferred Source, Primary Action, Hide HUD, Pop to Root.
- Wrap-only preference: Wrap Column.
- Unwrap-only preferences: Strip Soft Hyphens, Keep Blank Lines.
- Cross-extension provider support via `launchCommand` callback (LitoMore convention).
