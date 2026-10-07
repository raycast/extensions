# ASCII Kit

**Text diagrams for PRs, Slack, Linear and docs**: hierarchy, structure, flows and options,
without screenshots. Write it as plain text, select it, press a hotkey, pick a format from a
live preview.

<!-- gen:storeCounts -->
**40 formats** in 9 kinds · **234 glyphs** in 19 groups · **38 templates** in 5 sections
<!-- /gen:storeCounts -->

## Commands

| Command           | What it does |
| ----------------- | ------------ |
| Compose Diagram   | Turns selected text into trees, boxes, tables, flows, sequence diagrams, charts, plans, code callouts and styled text, each format with a live preview |
| Search Glyphs     | Box-drawing, arrows, markers, blocks, keys and more, searchable by meaning, with animated spinners |
| Diagram Templates | Ready-made skeletons: wireframe, panels, git graph, Gantt, kanban, code callouts… |

<!-- gen:showcase -->
An indented list becomes a tree. Text after two spaces lines up as a note.

```
Page                   Page
  Header  sticky       ├── Header            sticky
    Logo               │   ├── Logo
    Account menu   →   │   ╰── Account menu
  Results  paged       ╰── Results           paged
    Result card            ├── Result card
    Pagination             ╰── Pagination
```

`A -> B: label` lines become a sequence diagram.

```
Browser -> API: POST /search       Browser               API                Index
API -> Index: query                   │                   │                   │
Index --> API: hits                   │─ POST /search ───►│                   │
API --> Browser: 200 results   →      │                   │─ query ──────────►│
                                      │                   │◄┄┄┄┄┄┄┄┄┄┄┄ hits ┄│
                                      │◄┄┄┄┄ 200 results ┄│                   │
                                      │                   │                   │
```

`label value` rows become a chart.

```
Design 40       Design  ████████████████████████████████████████ 40
Build 29    →   Build   █████████████████████████████            29
QA 12.5         QA      ████████████▌                            12.5
Launch 3        Launch  ███                                      3
```
<!-- /gen:showcase -->

## Compose Diagram

Compose reads the selected text. Without a selection it falls back to the clipboard, and with
neither it opens a text box you can type into.

The detected format is listed first under **Suggested**. Formats that can't draw the input
sink to the bottom with a note saying why.

<!-- gen:inputs -->
| Kind | Write this | Formats |
| --- | --- | --- |
| Tree | an indented or bulleted list (tabs or spaces), or an existing tree to restyle | light; rounded; heavy; plain ASCII; top-down (org chart); nested boxes |
| Box | any text; a line of `---` becomes a divider | light; rounded; heavy; double; titled; titled, rounded; titled, heavy |
| Table | rows separated by tabs (from a spreadsheet), pipes, 2+ spaces or commas; first row is the header | box; rounded; plain; markdown; kanban board |
| Flow | `A > B > C` (also `->`, `→`, `=>`), or one step per line | inline arrows; boxes across; boxes down; boxes down, heavy arrows |
| Sequence | one message per line: `A -> B: label`, `B --> A: reply` for a dashed return | lanes |
| Chart | `label value` rows (tab, colon or spaces before the number; `$`, `%` and `1,200` are fine), or one line of numbers | bars; columns; line; sparkline |
| Plan | `task start length` or `task 2-4` rows for a Gantt chart (a first line like `Sprint` names the unit); `date: label` rows for a timeline | Gantt; timeline across; timeline down |
| Code | code lines, then `target: note` lines whose target appears in the code (wrap it in backticks if it contains a colon) | callouts |
| Text | any text: the styles work letter by letter; the banner has A–Z, 0–9 and basic punctuation | bold; italic; bold italic; monospace; strikethrough; underline; banner, small caps; banner, tall caps; banner, tall, mixed case |
<!-- /gen:inputs -->

| Key   | Action                                           |
| ----- | ------------------------------------------------ |
| `↵`   | Paste (replaces the selection)                   |
| `⌘↵`  | Copy                                             |
| `⌘⇧C` | Copy wrapped in ``` (what Slack and GitHub need) |
| `⌘⇧V` | Paste wrapped in ```                             |
| `⌘E`  | Edit the input and preview again                 |

The preview pane flags glyphs that may render as emoji, and diagrams wider than 72 columns.
Raycast's preview pane wraps at about 56 columns, so a wider diagram looks broken there but
still pastes correctly.

## Search Glyphs and Diagram Templates

Each glyph's detail pane shows its width and code points, and warns when a glyph depends on
the font or has an emoji form. `↵` pastes, `⌘↵` copies, and `⌘⇧C` copies a multi-line glyph
or a template as a code block. Spinners animate while selected: `↵` pastes the first frame,
`⌘↵` copies them all.

## Setup

- **Hotkeys:** Raycast Settings → Extensions → ASCII Kit. For example `⌃⌥A` for Compose
  Diagram, `⌃⌥G` for Search Glyphs and `⌃⌥T` for Diagram Templates.
- **Accessibility:** reading the selected text needs Raycast to have Accessibility permission
  (System Settings → Privacy & Security → Accessibility). Raycast usually has it already.

## Where it renders

Alignment only holds in a **monospace font**, so paste diagrams into a code block: `⌘⇧C`
does that for Slack, GitHub, Linear and Notion. Inline glyphs (`→ ✓ · ↳`) work anywhere.
Email and Google Docs use proportional fonts, so diagrams don't line up there.

## More

The [source repo](https://github.com/villemikkola/ascii-kit) has a gallery of every format,
glyph and template, recipes, and a snippet pack for typing the most common glyphs inline
(`!tee` → `├── `), which you import with Raycast → *Import Snippets*.
