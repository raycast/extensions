# ASCII Kit: design notes

Decisions, learnings and open ideas. The [README](../README.md) covers how to use the kit;
this file covers why it is the way it is, for anyone changing it.

## Design decisions

- **Snippets for inline glyphs, the extension for structure.** Only glyphs typed daily get a
  `!` keyword. Everything else is found by meaning in Search Glyphs.
- **Every generator is a pure function** in `src/lib/`, tested without Raycast. The commands
  are thin UI over them. Templates call the generators wherever possible, so their alignment
  can't drift.
- **Display width is measured, never assumed.** `lib/width.ts` counts graphemes: emoji and CJK
  count as 2 columns, combining marks as 0. Every generator pads with it.
- **Compose ranks formats; it never refuses the input.** `detectKinds` orders the kinds.
  `unusable()` (per kind) and `Format.unusable` (per format) explain why a format can't draw
  the input, and those formats sink below the ones that can.
- **Text styles are never the suggestion.** They're a deliberate choice, and they carry a
  screen-reader caveat in the preview.
- **Heavy straight arrows are the default** in templates and generated flows. Outline
  (diagonal) and solid (block) arrows stay in the palette, with a caveat.
- **The README's galleries are generated.** `npm run readme` renders them from the same
  generators and data the extension uses, so the examples can't go stale. The source repo's CI
  (`.github/workflows/ci.yml`) runs `npm run readme -- --check`.

## Learnings

### Fonts

The kit should look reasonable in **any** monospace font. It isn't tuned to one.

| Glyph family | Behavior across fonts |
| --- | --- |
| Straight box lines `─ │ ┌ ┼ ━ ┃ ═` | join across rows in practically every font |
| Diagonals `╱ ╲` | often stop short of the cell corners, so outlines show small breaks. Kept, with a caveat |
| Stacked blocks `█ ▀ ▄` (solid arrows, column charts, banners) | solid where the font's block glyphs fill the line height; striped in Menlo, Monaco and SF Mono, and at loose line heights |
| Single-row blocks (bars, sparklines, progress) | fine everywhere |

Other findings:
- **Stepped outline arrows** (straight lines only) join everywhere, but read as plus signs,
  not arrows. Rejected.
- **A 45° head needs half-block pixels.** A half block (`▀ ▄`) is roughly square, so one pixel
  per half block gives the head its slope.
- **Toggles need a pill shape.** `━━●──` reads as a slider. The toggle is `(   ●)` / `(●   )`,
  or labeled: `[ ON ●]`.

To judge a design, use `npm run render-fonts -- in.txt out.png`. It renders a text file in
Menlo, Monaco, SF Mono and Geist Mono at line heights 1.2 and 1.618 (Zed's "comfortable"
default). Fonts that only ship inside an editor can't be loaded by the script, so check
those by pasting into the editor.

### Unicode width traps

- **Text-default emoji** such as `▶ ⚠ ☑ ✔ ↔ ↕` render 1 or 2 columns wide, depending on the app.
  They're flagged by `riskyGlyphs()` (Extended_Pictographic, no emoji presentation). Diagrams
  use `► ▼ ✓ ✗` instead.
- **Box-drawing characters** are "ambiguous width" in Unicode's tables, but render 1 column
  wide in every Western monospace font, so they count as 1.
- **Circled numbers `① ❶`** depend on the font, so templates use `(1)` markers.
- **Mathematical alphanumerics** (the bold and italic text styles) are 1 column wide.
  Combining strike and underline marks are 0.

### Widths

- **Raycast's detail pane wraps code blocks at about 56 columns**, measured from a screenshot.
  A test keeps every template within 56.
- **Compose's preview warns past 72 columns**, the practical limit for Slack. A generated
  diagram can be wider than 56. It looks wrapped in Raycast but pastes correctly.

### Raycast API (v2.5)

- `List.Item.Detail` markdown renders code blocks in a monospace font; that's the whole preview mechanism.
- `Grid` items can only show images, so text glyphs go in a `List`. It's sectioned, with a detail pane.
- Animation works through React state and `setInterval`. Only the selected spinner animates
  (`onSelectionChange`), to keep re-renders cheap.
- `getSelectedText()` throws when nothing is selected. Compose falls back to the clipboard,
  then to a typed input form.
- `Keyboard.Shortcut.Common.Copy` is `⌘⇧C` and `Common.Edit` is `⌘E`. `ray lint` warns when
  a hand-written shortcut duplicates one of these.
- TypeScript 6 defaults `types` to `[]`, so `tsconfig.json` needs `"types": ["node"]`.

### Editing Markdown from scripts

Scripts that edit Markdown must not use JavaScript's `String.replace` with a string
replacement. `` $` ``, `$&` and `$'` are replacement patterns, and a `` `$` `` inside the
replacement text once duplicated half the README into a table cell. Pass a function as the
replacement (as `scripts/gen-readme.ts` does), or use Python.

When a hand-written test expectation disagrees with a generator, check which one is wrong
before changing either. It has gone both ways.

## Releasing

The Raycast Store builds extensions from the
[`raycast/extensions`](https://github.com/raycast/extensions) monorepo. This repo stays the
source of truth:

1. Add an entry at the top of `CHANGELOG.md` (`## [Title] - {PR_MERGE_DATE}`).
2. `npm run lint && npm test && npm run build`.
3. `npm run publish` opens a pull request on `raycast/extensions`, or updates the open one.
   Raycast reviews it, and the Store updates when it's merged.

People can also send fixes straight to the copy in `raycast/extensions`. Pull those back
with `npx @raycast/api@latest pull-contributions` before the next publish.

Store screenshots live in `metadata/` (PNG, 2000×1250, 3–6 of them, taken with Raycast's
Window Capture on one background). Images the README links to live in `media/`.

## Open ideas

- **Banner letters** `B` and `3` are the weakest glyphs in the 2-row (small caps) font, because
  3×4 pixels leaves little room. The tall font doesn't have this problem.
- **Wide org charts** past about 4 children per level exceed 72 columns. A compact mode with
  narrower gaps or boxes would help.
- **The preview width could be a setting,** so Compose warns at the Raycast pane width
  instead of Slack's.
- **Timelines are spaced evenly,** not proportionally to time. Proportional spacing would need
  dates it can parse.
- **Gantt bars start on whole cells.** A task starting partway through a cell can't be shown,
  because there's no left-partial block glyph.
