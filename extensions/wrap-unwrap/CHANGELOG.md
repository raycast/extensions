# Wrap Unwrap Changelog

## [Reflow Correctness and Large-Paste Performance] - 2026-07-26

- Fix **Unwrap Text** joining a hyphen-broken word with a dangling space — `well-` + `known` now rejoins as `well-known`, not `well- known`. Applies to compounds, hyphen chains (`state-of-the-art`), and numeric ranges (`5-10`).
- Fix **Strip Soft Hyphens** destroying real compounds. The preference now removes only a true Unicode soft hyphen (U+00AD), which exists solely to mark a line break; an ASCII `-` is always preserved, since it cannot be distinguished from a genuine compound.
- Fix hyphen rejoining for non-ASCII text — accented Latin, Cyrillic, Greek, CJK, and astral characters now rejoin correctly instead of keeping a dangling space.
- Fix a literal hyphen inside inline code or a link URL being corrupted when the span broke across lines (`` `foo-` `` + `` `bar` `` no longer becomes `` `foobar` ``). Link destinations with balanced parentheses are handled correctly.
- Fix blockquote indentation being discarded, which hoisted a quote out of its containing list item.
- Fix **Unwrap Text** failing to rejoin lines inside a blockquote written without a space after the marker (`>text` rather than `> text`) — the wrapped continuation lines were left as separate lines instead of reflowing. `>text` and `> text` are the same quote, so they now group together.
- Fix a fenced code block being ended early by a line that looks like a closer but carries an info string, which exposed the block's contents to reflow.
- Fix tab-indented code being treated as prose and reflowed, losing its indentation. Indent width is now measured in columns, so any mix of tabs and spaces reaching column 4 is recognized.
- Fix **Wrap Text** overrunning the requested **Wrap Column** on tab-indented lines — a tab was counted as one character rather than the four columns it occupies.
- Fix **Wrap Text** breaking a line so that it began with a literal `-`, `#`, ` ``` `, `>`, or `---`, which was then re-read as a new list item, heading, code fence, blockquote, or heading underline. In the `>` case the character was **deleted outright** on the next unwrap.
- Fix **Unwrap Text** splitting a single blockquote whose `>` markers were indented inconsistently — CommonMark allows up to three spaces before the marker, so those lines belong to the same quote.
- Fix a link whose URL contains balanced parentheses being split across lines by **Wrap Text**.
- Fix **Unwrap Text** merging a blockquote nested inside a list item with a following top-level blockquote — indentation before the `>` marker is structural, not decoration.
- Fix **Unwrap Text** splitting one blockquote in two when a list appeared earlier in the document without a blank line closing it — a line back at the margin ends a list, so the following quotes belong to the same paragraph.
- Fix **Wrap Text** slowing down sharply at large **Wrap Column** values when the text contains a run of characters that could start a new block (`-`, `#`, `>`). The check that prevents those characters from beginning a wrapped line now inspects a fixed number of words rather than a full line's worth, so wrapping stays fast at any column width.
- Fix **Unwrap Text** mis-handling a backslash-escaped `` ` `` or `](`, which was read as opening real inline code or a link and suppressed the correct hyphen rejoining.
- Fix **Wrap Text** misaligning the continuation lines of a tab-indented list item — a tab counts as one character but renders as a full tab stop, so continuations were under-indented and no longer lined up with the item's text.
- Fix **Wrap Text** continuation lines on a task list item (`- [ ]`) not clearing the checkbox, so wrapped text sat under the `[ ]` instead of aligning with the item's text.
- Fix large pastes hanging Raycast: three quadratic code paths meant an input within the supported 1 MB limit could take minutes with no progress shown. Wrapping and unwrapping 1 MB now completes in a fraction of a second.
- Fix a link label containing nested brackets being split mid-link.
- Fix text containing Unicode private-use characters being silently rewritten or deleted by the internal inline-token placeholder.
- Fix an even-numbered run of trailing backslashes being treated as a hard line break instead of escaped literal backslashes.
- Fix an invalid **Wrap Column** value with a numeric prefix (for example `12px`) being accepted as `12` instead of falling back to 80.
- Update the **Strip Soft Hyphens** description and README to state what the preference actually does — both previously promised that `inter-` + `esting` would become `interesting`, which is no longer the behavior.

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
