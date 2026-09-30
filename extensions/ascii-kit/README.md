<!-- gen:hero -->
```
▄▀▄ ▄▀▀ ▄▀▀ ▀█▀ ▀█▀    █ █ ▀█▀ ▀█▀
█▀█  ▀▄ █    █   █     █▀▄  █   █
▀ ▀ ▀▀   ▀▀ ▀▀▀ ▀▀▀    ▀ ▀ ▀▀▀  ▀
```
<!-- /gen:hero -->

**Text diagrams for PRs, Slack, Linear and docs**: hierarchy, structure, flows and options,
without screenshots. A [Raycast](https://www.raycast.com) extension and a small snippet pack.

<!-- gen:counts -->
**40 formats** in 9 kinds · **234 glyphs** in 19 groups · **38 templates** in 5 sections · **15 snippets**
<!-- /gen:counts -->

## At a glance

Write it as plain text, select it, press a hotkey, pick a format from a live preview:

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

What's in the kit:

```
ascii-kit
├── Compose Diagram     selected text → trees, boxes, tables, flows, sequences,
│                       charts, plans, code callouts, styled text; each format
│                       with a live preview
├── Search Glyphs       box-drawing, arrows, markers, blocks, keys and more,
│                       searchable by meaning, with animated spinners
├── Diagram Templates   skeletons: wireframe, Claude session, panels, git graph,
│                       Gantt, kanban, code callouts…
└── snippets/core.json  the few glyphs worth typing inline (!tee → ├── )
```

The split is deliberate: **snippets for the handful of glyphs you type inline**, and the
**extension for anything with structure**. Nobody remembers 60 keywords, and a diagram is
faster to generate from a list than to draw by hand.

## Install

You need macOS and [Raycast](https://www.raycast.com). Installing from source also needs
[Node.js](https://nodejs.org) 22 or later.

### From source

```sh
git clone https://github.com/villemikkola/ascii-kit.git
cd ascii-kit
npm install && npm run dev
```

Once Raycast shows "ASCII Kit", stop the dev server with `⌃C`. The extension stays installed.
To update later: `git pull`, then `npm install && npm run dev` again.

### From the Raycast Store

Not yet published. Until then, install from source.

### Snippets

Raycast → *Import Snippets* → [`snippets/core.json`](snippets/core.json) (from your clone,
or download the file). The snippets are separate from the extension, so this step is the same
however you installed it.

### Hotkeys

Raycast Settings → Extensions → ASCII Kit. Suggested:

| Command           | Hotkey | Alias |
| ----------------- | ------ | ----- |
| Compose Diagram   | `⌃⌥A`  | `cd`  |
| Search Glyphs     | `⌃⌥G`  | `gl`  |
| Diagram Templates | `⌃⌥T`  | `dt`  |

Compose reads the selected text, so Raycast needs Accessibility permission (it usually has
it already). Without a selection, Compose falls back to the clipboard. With neither, it
opens a text box you can type into.

## Daily flow

```
Inline glyph           type the snippet ··········· !ra → , !ok ✓ , !tee ├──
Some structure         write it as a plain list ··· select it ─► ⌃⌥A ─► pick ─► ↵
A glyph you forgot     ⌃⌥G, search by meaning ····· "check", "elbow", "progress"
A layout or pattern    ⌃⌥T, pick a skeleton ······· edit the words in place
```

In Compose:

| Key   | Action                                                     |
| ----- | ---------------------------------------------------------- |
| `↵`   | Paste (replaces the selection)                             |
| `⌘↵`  | Copy                                                       |
| `⌘⇧C` | Copy wrapped in ``` (what Slack and GitHub need)           |
| `⌘⇧V` | Paste wrapped in ```                                       |
| `⌘E`  | Edit the input and preview again                           |

The detected format is listed first under **Suggested**, and formats that can't draw the
input sink to the bottom with a note saying why. The preview pane flags glyphs that may render
as emoji, and diagrams wider than 72 columns. Raycast's own preview pane wraps at about 56
columns, so a wider diagram looks broken there but still pastes correctly.

In Diagram Templates the same keys apply: `↵` pastes, `⌘⇧C` copies as a code block. The diff
template copies as ```` ```diff ```` so GitHub colors it. Every template is in the
[gallery](#templates).

## Gallery

Everything below is generated from the extension's own code (`npm run readme`), so it's
exactly what you get. Click a section to expand it.

### Compose formats

<!-- gen:formats -->
<details>
<summary><b>Tree</b> · 6 formats</summary>

Write an indented or bulleted list (tabs or spaces), or an existing tree to restyle. For example:

```
src
  components
    Button.tsx
    Card.tsx
  hooks
    useSearch.ts
  index.ts
```

**Tree · light**

```
src
├── components
│   ├── Button.tsx
│   └── Card.tsx
├── hooks
│   └── useSearch.ts
└── index.ts
```

**Tree · rounded**

```
src
├── components
│   ├── Button.tsx
│   ╰── Card.tsx
├── hooks
│   ╰── useSearch.ts
╰── index.ts
```

**Tree · heavy**

```
src
┣━━ components
┃   ┣━━ Button.tsx
┃   ┗━━ Card.tsx
┣━━ hooks
┃   ┗━━ useSearch.ts
┗━━ index.ts
```

**Tree · plain ASCII**

```
src
|-- components
|   |-- Button.tsx
|   `-- Card.tsx
|-- hooks
|   `-- useSearch.ts
`-- index.ts
```

**Tree · top-down (org chart)**

```
                                  ┌─────┐
                                  │ src │
                                  └──┬──┘
               ┌─────────────────────┴────┬─────────────────┐
        ┌──────┴──────┐               ┌───┴───┐       ┌─────┴─────┐
        │ components  │               │ hooks │       │ index.ts  │
        └──────┬──────┘               └───┬───┘       └───────────┘
       ┌───────┴────────┐                 │
┌──────┴──────┐   ┌─────┴─────┐   ┌───────┴───────┐
│ Button.tsx  │   │ Card.tsx  │   │ useSearch.ts  │
└─────────────┘   └───────────┘   └───────────────┘
```

**Tree · nested boxes**

```
╔═ src ════════════╗
║ ┌─ components ─┐ ║
║ │ Button.tsx   │ ║
║ │ Card.tsx     │ ║
║ └──────────────┘ ║
║ ┌─ hooks ──────┐ ║
║ │ useSearch.ts │ ║
║ └──────────────┘ ║
║ index.ts         ║
╚══════════════════╝
```

</details>
<details>
<summary><b>Box</b> · 7 formats</summary>

Write any text; a line of `---` becomes a divider. For example:

```
Search panel
---
Query input
Filters
Results list
```

**Box · light**

```
┌──────────────┐
│ Search panel │
├──────────────┤
│ Query input  │
│ Filters      │
│ Results list │
└──────────────┘
```

**Box · rounded**

```
╭──────────────╮
│ Search panel │
├──────────────┤
│ Query input  │
│ Filters      │
│ Results list │
╰──────────────╯
```

**Box · heavy**

```
┏━━━━━━━━━━━━━━┓
┃ Search panel ┃
┣━━━━━━━━━━━━━━┫
┃ Query input  ┃
┃ Filters      ┃
┃ Results list ┃
┗━━━━━━━━━━━━━━┛
```

**Box · double**

```
╔══════════════╗
║ Search panel ║
╠══════════════╣
║ Query input  ║
║ Filters      ║
║ Results list ║
╚══════════════╝
```

**Box · titled**

```
┌─ Search panel ─┐
│ Query input    │
│ Filters        │
│ Results list   │
└────────────────┘
```

**Box · titled, rounded**

```
╭─ Search panel ─╮
│ Query input    │
│ Filters        │
│ Results list   │
╰────────────────╯
```

**Box · titled, heavy**

```
┏━ Search panel ━┓
┃ Query input    ┃
┃ Filters        ┃
┃ Results list   ┃
┗━━━━━━━━━━━━━━━━┛
```

</details>
<details>
<summary><b>Table</b> · 5 formats</summary>

Write rows separated by tabs (from a spreadsheet), pipes, 2+ spaces or commas; first row is the header. For example:

```
Option	Effort	Risk
Patch in place	1	Low
New service	5	Medium
```

**Table · box**

```
┌────────────────┬────────┬────────┐
│ Option         │ Effort │ Risk   │
├────────────────┼────────┼────────┤
│ Patch in place │      1 │ Low    │
│ New service    │      5 │ Medium │
└────────────────┴────────┴────────┘
```

**Table · rounded**

```
╭────────────────┬────────┬────────╮
│ Option         │ Effort │ Risk   │
├────────────────┼────────┼────────┤
│ Patch in place │      1 │ Low    │
│ New service    │      5 │ Medium │
╰────────────────┴────────┴────────╯
```

**Table · plain**

```
Option          Effort  Risk
──────────────  ──────  ──────
Patch in place       1  Low
New service          5  Medium
```

**Table · markdown**

```
| Option         | Effort | Risk   |
| -------------- | -----: | ------ |
| Patch in place |      1 | Low    |
| New service    |      5 | Medium |
```

**Table · kanban board**

```
┌─ Option ───────┐ ┌─ Effort ───┐ ┌─ Risk ─────┐
│ Patch in place │ │ 1          │ │ Low        │
│ New service    │ │ 5          │ │ Medium     │
└────────────────┘ └────────────┘ └────────────┘
```

</details>
<details>
<summary><b>Flow</b> · 4 formats</summary>

Write `A > B > C` (also `->`, `→`, `=>`), or one step per line. For example:

```
Draft > Review > Approved > Published
```

**Flow · inline arrows**

```
Draft → Review → Approved → Published
```

**Flow · boxes across**

```
┌───────┐   ┌────────┐   ┌──────────┐   ┌───────────┐
│ Draft │──►│ Review │──►│ Approved │──►│ Published │
└───────┘   └────────┘   └──────────┘   └───────────┘
```

**Flow · boxes down**

```
┌───────────┐
│   Draft   │
└─────┬─────┘
      ▼
┌───────────┐
│  Review   │
└─────┬─────┘
      ▼
┌───────────┐
│ Approved  │
└─────┬─────┘
      ▼
┌───────────┐
│ Published │
└───────────┘
```

**Flow · boxes down, heavy arrows**

```
┌───────────┐
│   Draft   │
└───────────┘
      ┃
      ┃
      ▼
┌───────────┐
│  Review   │
└───────────┘
      ┃
      ┃
      ▼
┌───────────┐
│ Approved  │
└───────────┘
      ┃
      ┃
      ▼
┌───────────┐
│ Published │
└───────────┘
```

</details>
<details>
<summary><b>Sequence</b> · 1 formats</summary>

Write one message per line: `A -> B: label`, `B --> A: reply` for a dashed return. For example:

```
Browser -> API: POST /search
API -> Index: query
Index --> API: hits
API --> Browser: 200 results
```

**Sequence · lanes**

```
Browser               API                Index
   │                   │                   │
   │─ POST /search ───►│                   │
   │                   │─ query ──────────►│
   │                   │◄┄┄┄┄┄┄┄┄┄┄┄ hits ┄│
   │◄┄┄┄┄ 200 results ┄│                   │
   │                   │                   │
```

</details>
<details>
<summary><b>Chart</b> · 4 formats</summary>

Write `label value` rows (tab, colon or spaces before the number; `$`, `%` and `1,200` are fine), or one line of numbers. For example:

```
Mon 3
Tue 5
Wed 9
Thu 4
Fri 2
Sat 6
```

**Chart · bars**

```
Mon  █████████████▍                           3
Tue  ██████████████████████▎                  5
Wed  ████████████████████████████████████████ 9
Thu  █████████████████▊                       4
Fri  ████████▉                                2
Sat  ██████████████████████████▋              6
```

**Chart · columns**

```
         9
        ███
        ███          6
     5  ███         ▃▃▃
    ▄▄▄ ███  4      ███
 3  ███ ███ ▄▄▄     ███
▅▅▅ ███ ███ ███  2  ███
███ ███ ███ ███ ▆▆▆ ███
███ ███ ███ ███ ███ ███
───────────────────────
Mon Tue Wed Thu Fri Sat
```

**Chart · line**

```
9.0 ┤                ╭──╮
8.1 ┤              ╭─╯  ╰╮
7.3 ┤            ╭─╯     ╰─╮
6.4 ┤          ╭─╯         ╰╮                    ╭
5.5 ┤        ╭─╯            ╰─╮                ╭─╯
4.6 ┤    ╭───╯                ╰─╮            ╭─╯
3.8 ┤╭───╯                      ╰───╮      ╭─╯
2.9 ┼╯                              ╰───╮╭─╯
2.0 ┤                                   ╰╯
     Mon                                        Sat
```

**Chart · sparkline**

```
▂▄█▃▁▅  2–9
```

</details>
<details>
<summary><b>Plan</b> · 3 formats</summary>

Write `task start length` or `task 2-4` rows for a Gantt chart (a first line like `Sprint` names the unit); `date: label` rows for a timeline. For example:

```
Sprint
Discovery 1 1
Design 2-3
Build 3 3.5
Launch 6.5 0.5
```

**Plan · Gantt**

```
           S1  S2  S3  S4  S5  S6
Discovery  ████
Design         ████████
Build              ██████████████
Launch                           ██
```

**Plan · timeline across**

```
──●──────────●───────────●──────────●──────────●──────────►
             Discovery   Design     Build      Launch
  Sprint     1 1         2-3        3 3.5      6.5 0.5
```

**Plan · timeline down**

```
           ● Sprint
           │
Discovery  ● 1 1
           │
Design     ● 2-3
           │
Build      ● 3 3.5
           │
Launch     ● 6.5 0.5
           ▼
```

</details>
<details>
<summary><b>Code</b> · 1 formats</summary>

Write code lines, then `target: note` lines whose target appears in the code (wrap it in backticks if it contains a colon). For example:

```
const total = items.reduce(sum)
items.reduce: throws on an empty array
sum: no initial value
```

**Code · callouts**

```
const total = items.reduce(sum)
              ─────┬────── ─┬─
                   │        ╰── no initial value
                   ╰── throws on an empty array
```

</details>
<details>
<summary><b>Text</b> · 9 formats</summary>

Write any text: the styles work letter by letter; the banner has A–Z, 0–9 and basic punctuation. For example:

```
Release notes v2
```

**Text · bold**

```
𝗥𝗲𝗹𝗲𝗮𝘀𝗲 𝗻𝗼𝘁𝗲𝘀 𝘃𝟮
```

**Text · italic**

```
𝘙𝘦𝘭𝘦𝘢𝘴𝘦 𝘯𝘰𝘵𝘦𝘴 𝘷2
```

**Text · bold italic**

```
𝙍𝙚𝙡𝙚𝙖𝙨𝙚 𝙣𝙤𝙩𝙚𝙨 𝙫𝟮
```

**Text · monospace**

```
𝚁𝚎𝚕𝚎𝚊𝚜𝚎 𝚗𝚘𝚝𝚎𝚜 𝚟𝟸
```

**Text · strikethrough**

```
R̶e̶l̶e̶a̶s̶e̶ n̶o̶t̶e̶s̶ v̶2̶
```

**Text · underline**

```
R̲e̲l̲e̲a̲s̲e̲ n̲o̲t̲e̲s̲ v̲2̲
```

**Text · banner, small caps**

```
█▀█ █▀▀ █   █▀▀ ▄▀▄ █▀▀ █▀▀    █▄ █ █▀█ ▀█▀ █▀▀ █▀▀    █ █ ▀▀█
█▀▄ ██▄ █▄▄ ██▄ █▀█ ▄▄█ ██▄    █ ▀█ █▄█  █  ██▄ ▄▄█    ▀▄▀ █▄▄
```

**Text · banner, tall caps**

```
█▀▄ █▀▀ █   █▀▀ ▄▀▄ ▄▀▀ █▀▀    █▄ █ ▄▀▄ ▀█▀ █▀▀ ▄▀▀    █ █ ▀▀▄
█▀▄ █▀  █   █▀  █▀█  ▀▄ █▀     █ ▀█ █ █  █  █▀   ▀▄    ▀▄▀ ▄▀
▀ ▀ ▀▀▀ ▀▀▀ ▀▀▀ ▀ ▀ ▀▀  ▀▀▀    ▀  ▀  ▀   ▀  ▀▀▀ ▀▀      ▀  ▀▀▀
```

**Text · banner, tall, mixed case**

```
█▀▄     █                             ▄                 ▀▀▄
█▀▄ ██▀ █ ██▀ ▄▀█  █▀ ██▀    █▀▄ ▄▀▄ ▀█▀ ██▀  █▀    █ █ ▄▀
▀ ▀  ▀▀ ▀  ▀▀  ▀▀ ▀▀   ▀▀    ▀ ▀  ▀   ▀▀  ▀▀ ▀▀      ▀  ▀▀▀
```

</details>
<!-- /gen:formats -->

### Glyphs

<!-- gen:glyphs -->
```
Tree              ├──   └──   │   ╰──   ┣━━   ┗━━   ┃
Lines             ─   │   ━   ┃   ═   ║   ┄   ┆
Line variants     ┝   ┥   ┿   ╂   ╒   ╕   ╘   ╛   ╞   ╡   ┅   ┇   ┉   ┋   ╴
                  ╶   ╵   ╷
Box · light       ┌   ┐   └   ┘   ├   ┤   ┬   ┴   ┼
Box · rounded     ╭   ╮   ╰   ╯
Box · heavy       ┏   ┓   ┗   ┛   ┣   ┫   ┳   ┻   ╋
Box · double      ╔   ╗   ╚   ╝   ╠   ╣   ╦   ╩   ╬
Arrows            →   ←   ↑   ↓   ↔   ↕   ⇒   ⇐   ⇔   ↳   ↻   ↺   ►   ◄   ▲
                  ▼
Big arrows        ━━━━━━━━━►   ◄━━━━━━━━━   ═════════►   ┅┅┅┅┅┅┅┅┅►
Status & markers  ✓   ✗   ❯   ·   •   ◦   ●   ○   ◉   ◐   ■   □   ☐   ☒   ◆
                  ◇   ★   …   ×   ≈   ≠   ±
Claude & TUI      ⎿   ●   ✻   ⏵⏵   ⧉   ↯   ▸   ▾   ▴   ◂   ⋮   ⋯   [x]   [ ]
                  (•)   ( )   (   ●)   (●   )   [ ON ●]   [● OFF]
                  ━━━━━━●───── 50%   [ Button ]   Option ▾
                  ↵ select · ↑↓ navigate · esc cancel
Motion            ⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏   ⣾⣽⣻⢿⡿⣟⣯⣷   ⠁⠂⠄⡀⢀⠠⠐⠈   ·✢✶✻✽✻✶✢   ◜◠◝◞◡◟
                  ◐◓◑◒   ◰◳◲◱   -\|/   ▁▂▃▄▅▆▇█▇▆▅▄▃▂
Shapes            ╱   ╲   ╳   ◜   ◝   ◞   ◟   ◠   ◡   ◢   ◣   ◤   ◥   ◯   ⬡
                  ⬢   ◈   ✦   ▢   ( label )
Blocks & bars     █   ▓   ▒   ░   ▏▎▍▌▋▊▉   ▁▂▃▄▅▆▇█   ████████░░░░ 67%
Fine blocks       ▀   ▄   ▌   ▐   ▖▗▘▝   ▚▞   ▙▛▜▟   ⠁⠂⠄⡀⠈⠐⠠⢀   ⣀⣤⣶⣿   ▔   ▁
                  ▏   ▕
Typography        ⁰¹²³⁴⁵⁶⁷⁸⁹   ₀₁₂₃₄₅₆₇₈₉   ⁺⁻ⁿ   ½ ⅓ ¼ ¾ ⅔   † ‡ §
                  (1) (2) (3)   ① ② ③ ④ ⑤   ❶ ❷ ❸ ❹ ❺   “ ” ‘ ’   – —
                  ° µ ‰ №   € £ ¥
Math              ∈ ∉   ⊂ ⊆   ∩ ∪   ∀ ∃   ¬ ∧ ∨ ⊕   ≡   ∅   ∞   Δ   ∑   √
                  ≪ ≫
Keys              ⌘   ⌥   ⌃   ⇧   ↵   ⌫   ⎋   ⇥   ␣
Separators        ────────────────────────────────────────
                  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
                  ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄
                  ── Section ─────────────────────────────
```

Big arrows are multi-line:

```
┃     ━━━╲          ┃╲              █▄         ┏━━┓
┃     ━━━╱     ━━━━━┛ ╲     ▄▄▄▄▄▄▄▄███▄       ┃  ┃
▼              ━━━━━┓ ╱     ▀▀▀▀▀▀▀▀███▀     ━━┛  ┗━━
                    ┃╱              █▀       ╲      ╱
                                              ╲    ╱
                                               ╲  ╱
                                                ╲╱
```

<details>
<summary>What each group is for</summary>

| Group | What it's for |
| --- | --- |
| Tree | Hierarchies, file structures. Pieces include the trailing spaces. |
| Lines | Rules, connectors, dashed edges for optional or async links. |
| Line variants | Mixed weights and styles for joining a heavy line to a light box, and dashed or cut-off edges. |
| Box · light | The default. Corners, then joints: ├ ┤ for dividers, ┬ ┴ ┼ for columns. |
| Box · rounded | Softer: UI elements, cards, buttons. Use light lines and joints with these. |
| Box · heavy | Emphasis: the selected option, the component under discussion. |
| Box · double | Containers and boundaries: a system, a page, a modal around other boxes. |
| Arrows | Flow, cause and effect, before → after. ► and ▼ are the safe arrowheads for diagrams. |
| Big arrows | Heavy arrows work in any font. Outline and solid arrows carry more weight, but how cleanly they join depends on the font. |
| Status & markers | Checklists, option lists, states. ❯ marks the selected row, like the Claude Code picker. |
| Claude & TUI | The vocabulary of Claude Code and terminal UIs, for mocking or describing CLI and chat UX. |
| Motion | Spinner frames: paste one to mock a loading state, or copy them all for a spec or CLI. |
| Shapes | Non-rectangular pieces: diagonals for diamonds and fan-outs, arcs and triangles, node shapes. |
| Blocks & bars | Progress bars, meters, sparklines, shading. Eighth blocks give fine-grained bar ends. |
| Fine blocks | Double-resolution pixels: half blocks and quadrants for charts and pixel art, braille for dot plots. |
| Typography | Footnotes, units, fractions and numbered markers for referring to parts of a diagram. |
| Math | Specs and rules: membership, sets, logic and comparisons. |
| Keys | Keyboard shortcuts in docs and PR descriptions. |
| Separators | Section breaks inside long Slack messages or PR descriptions. |

</details>
<!-- /gen:glyphs -->

### Templates

<!-- gen:templates -->
#### Basics

<details>
<summary>Box with header</summary>

A single component, card or concept with a title and details.

```
┌───────────────┐
│ Title         │
├───────────────┤
│ First detail  │
│ Second detail │
└───────────────┘
```

</details>
<details>
<summary>Tree</summary>

File structure, component hierarchy, navigation, org of concepts.

```
root
├── child           note
│   ├── grandchild
│   └── grandchild
├── child
│   └── grandchild
└── child           note
```

</details>
<details>
<summary>Compare A | B</summary>

Two options side by side with trade-offs, for a decision in a PR or thread.

```
┌────────────┬────────────┐
│ Option A   │ Option B   │
├────────────┼────────────┤
│ ✓ Strength │ ✓ Strength │
│ ✓ Strength │ ✗ Weakness │
│ ✗ Weakness │ ✗ Weakness │
└────────────┴────────────┘
```

</details>
<details>
<summary>Option picker</summary>

Presenting choices with one recommended, like the Claude Code question picker.

```
  How should we handle it?

❯ 1. Option one (Recommended)
     What it means and its trade-off.
  2. Option two
     What it means and its trade-off.
  3. Option three
     What it means and its trade-off.
```

</details>
<details>
<summary>Checklist</summary>

Status of a set of tasks in a PR description or standup.

```
✓ Done item
✓ Done item
◐ In progress
○ Not started
✗ Dropped: reason
```

</details>
<details>
<summary>Markdown table</summary>

Where the destination renders markdown tables (GitHub, Notion, Linear). `--:` right-aligns a number column.

```
| Column | Column | Count |
| ------ | ------ | ----: |
| value  | value  |     1 |
| value  | value  |    20 |
```

</details>

#### Flow & structure

<details>
<summary>Steps, stacked</summary>

A linear process read top to bottom: onboarding, a pipeline, a migration.

```
┌─────────────┐
│  Step one   │
└──────┬──────┘
       ▼
┌─────────────┐
│  Step two   │
└──────┬──────┘
       ▼
┌─────────────┐
│ Step three  │
└─────────────┘
```

</details>
<details>
<summary>Steps, stacked, heavy arrows</summary>

The same, with arrows that carry more weight: a slide-like overview in a PR or doc.

```
 ┌──────────┐
 │ Step one │
 └──────────┘
      ┃
      ┃
      ▼
 ┌──────────┐
 │ Step two │
 └──────────┘
      ┃
      ┃
      ▼
┌────────────┐
│ Step three │
└────────────┘
```

</details>
<details>
<summary>Steps, across</summary>

A short linear flow that fits on one line: states, stages, handoffs.

```
┌───────┐   ┌───────────┐   ┌────────┐
│ Draft │──►│ In review │──►│ Merged │
└───────┘   └───────────┘   └────────┘
```

</details>
<details>
<summary>Before → after</summary>

A change to a structure or layout: what it was and what it becomes.

```
┌─────────────┐     ┌─────────────┐
│ Before      │     │ After       │
├─────────────┤     ├─────────────┤
│ Page        │ ──► │ Page        │
│   Header    │     │   Header    │
│   Old panel │     │   New panel │
│   Footer    │     │   Footer    │
└─────────────┘     └─────────────┘
```

</details>
<details>
<summary>Before → after, labeled</summary>

The same change, with the transformation named on a heavy arrow. Works in every font.

```
┌─────────────┐              ┌─────────────┐
│ Before      │              │ After       │
├─────────────┤              ├─────────────┤
│ Page        │   becomes    │ Page        │
│   Header    │  ━━━━━━━━━►  │   Header    │
│   Old panel │              │   New panel │
│   Footer    │              │   Footer    │
└─────────────┘              └─────────────┘
```

</details>
<details>
<summary>Before → after, outline arrow</summary>

The transformation as the headline, with an outline arrow. Uses ╱ ╲ diagonals: in some fonts they stop short of the cell corners and the outline shows small breaks. Heavy arrows are the safe fallback.

```
┌─────────────┐            ┌─────────────┐
│ Before      │            │ After       │
├─────────────┤       ┃╲   ├─────────────┤
│ Page        │  ━━━━━┛ ╲  │ Page        │
│   Header    │  ━━━━━┓ ╱  │   Header    │
│   Old panel │       ┃╱   │   New panel │
│   Footer    │            │   Footer    │
└─────────────┘            └─────────────┘
```

</details>
<details>
<summary>Before → after, solid arrow</summary>

The transformation as the headline, with a solid block arrow. Solid where the font's block glyphs fill the whole line height; striped in fonts where they don't. Heavy arrows are the safe fallback.

```
┌─────────────┐                ┌─────────────┐
│ Before      │                │ After       │
├─────────────┤          █▄    ├─────────────┤
│ Page        │  ▄▄▄▄▄▄▄▄███▄  │ Page        │
│   Header    │  ▀▀▀▀▀▀▀▀███▀  │   Header    │
│   Old panel │          █▀    │   New panel │
│   Footer    │                │   Footer    │
└─────────────┘                └─────────────┘
```

</details>
<details>
<summary>Sequence</summary>

Who calls whom, in order: requests, events, handoffs between people or systems.

```
Client          Server           Store
   │               │               │
   │─ request ────►│               │
   │               │─ read ───────►│
   │               │◄┄┄┄┄┄┄┄ data ┄│
   │◄┄┄┄ response ┄│               │
   │               │               │
```

</details>
<details>
<summary>State machine</summary>

States and the transitions between them, including a loop back.

```
┌────────┐  submit  ┌──────────┐  approve  ┌──────────┐
│ Draft  │─────────►│ Review   │──────────►│ Approved │
└────────┘          └────┬─────┘           └──────────┘
     ▲                   │
     └───── reject ──────┘
```

</details>
<details>
<summary>Decision diamond</summary>

A flowchart branch: one question, a yes path and a no path.

```
          ┌───────────┐
          │ Submitted │
          └─────┬─────┘
                ▼
               ╱╲
       no ◄───╱ok╲───► yes
       │      ╲  ╱      │
       ▼       ╲╱       ▼
  ┌────────┐       ┌─────────┐
  │ Revise │       │ Publish │
  └────────┘       └─────────┘
```

</details>
<details>
<summary>Decision tree</summary>

Branching logic: if this, then that. Good for triage and rules.

```
Is it blocking?
├── yes                      → Fix now
└── no
    ├── Affects many users?  → Next sprint
    └── Edge case?           → Backlog
```

</details>
<details>
<summary>Git graph</summary>

Branches and merges: explaining a rebase, a release branch, or what landed where.

```
●    a1f3  main     Merge feature/search
├─╮
│ ●  9c2e  feature  Add result cards
│ ●  47bd  feature  Search hook
├─╯
●    e810  main     Initial layout
```

</details>
<details>
<summary>Service → database</summary>

Architecture sketches: a service and the store it reads and writes.

```
┌─────────┐        ╭──────────╮
│ Service │───────►├──────────┤
└─────────┘        │ Database │
                   ╰──────────╯
```

</details>

#### UI & TUI

<details>
<summary>Layout wireframe</summary>

Rough screen structure: where regions sit, before anything is designed.

```
╔══════════════════════════════════════════╗
║ Header                        [ Action ] ║
╠════════════╦═════════════════════════════╣
║ Sidebar    ║ Content                     ║
║            ║                             ║
║ › Item     ║ ┌─────────────┬───────────┐ ║
║ › Item     ║ │ Card        │ Card      │ ║
║ › Item     ║ └─────────────┴───────────┘ ║
║            ║                             ║
╚════════════╩═════════════════════════════╝
```

</details>
<details>
<summary>Numbered callouts</summary>

A wireframe with numbered regions and a legend, for feedback that points at parts.

```
┌──────────────────────────────────┐
│ (1) Logo              (2) Menu   │
├─────────────┬────────────────────┤
│ (3) Filters │ (4) Results        │
│             │                    │
└─────────────┴────────────────────┘
(1) Links home
(2) Account and settings
(3) Sticky while scrolling
(4) 20 per page, paged
```

</details>
<details>
<summary>Claude session</summary>

Mocking or describing an agent or CLI conversation: calls, results, thinking, input.

```
❯ Rename the search hook and update its callers

● Read(src/hooks/useSearch.ts)
  ⎿  Read 42 lines

● Update(src/hooks/useSearch.ts)
  ⎿  Updated with 3 additions and 1 removal

✻ Thinking…

╭──────────────────────────────────────────────╮
│ ❯                                            │
╰──────────────────────────────────────────────╯
  ⏵⏵ accept edits on · shift+tab to cycle
```

</details>
<details>
<summary>Form controls</summary>

A settings or form mock: inputs, dropdowns, checkboxes, radios, toggles, buttons.

```
Name       [ Ada Lovelace          ]
Role       Designer ▾
Notify     [x] Email   [ ] Slack
Billing    (•) Monthly   ( ) Yearly
Dark mode  (   ●) On
Autoplay   (●   ) Off
Volume     ━━━━━━●───── 50%

           [ Cancel ]  [ Save ]
```

</details>
<details>
<summary>Tabs</summary>

Tabbed navigation; the selected tab is open into its content.

```
 ╭──────────╮╭──────────╮╭──────────╮
 │ Overview ││ Activity ││ Settings │
─╯          ╰┴──────────┴┴──────────┴─────
  Content of the selected tab
```

</details>
<details>
<summary>Modal</summary>

A dialog over the page, with a shadow so it reads as floating.

```
┌──────────────────────────────┐
│ Delete 3 files?              │░
├──────────────────────────────┤░
│ This can't be undone.        │░
│                              │░
│       [ Cancel ]  [ Delete ] │░
└──────────────────────────────┘░
 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
```

</details>
<details>
<summary>Panels</summary>

A multi-pane TUI (lazygit, btop style): titled panels and a key-hint footer.

```
┌─ Files ──────┐┌─ Diff ─────────────────┐
│ ▾ src        ││   const q = input      │
│   ● app.ts   ││ - search(q)            │
│   ○ index.ts ││ + search(q, { limit }) │
│ ▸ tests      ││   render()             │
└──────────────┘└────────────────────────┘
 ↵ open · ⇥ switch pane · q quit
```

</details>
<details>
<summary>Loading states</summary>

Specifying every state of an async element: idle, loading, done, empty, error.

```
Idle     ○ Search
Loading  ⠋ Searching…
Done     ✓ 20 results
Empty    ∅ No results · try another term
Error    ✗ Couldn't reach the server · ↻ retry
```

</details>
<details>
<summary>Speech bubble</summary>

A quote, a comment, or what a user or system says in a flow.

```
╭──────────────────╮
│ Looks good to me │
╰──┬───────────────╯
   ╰─ Reviewer
```

</details>

#### Planning & data

<details>
<summary>Progress bars</summary>

Relative amounts at a glance: completion, share, capacity.

```
Design    ████████████████████ 100%
Build     ████████████░░░░░░░░  60%
Testing   ████░░░░░░░░░░░░░░░░  20%
Launch    ░░░░░░░░░░░░░░░░░░░░   0%
```

</details>
<details>
<summary>Gauges</summary>

Compact meters for a status update: usage, capacity, confidence.

```
CPU     [■■■■■■□□□□]  60%
Memory  [■■■■■■■■□□]  80%
Disk    [■■□□□□□□□□]  20%

◔ 25%   ◑ 50%   ◕ 75%   ● 100%
```

</details>
<details>
<summary>Stepper</summary>

Where something is in a fixed sequence: checkout, onboarding, a release train.

```
●━━━━━━━●━━━━━━━━━◉────────○───────○
Cart    Shipping  Payment  Review  Done
```

</details>
<details>
<summary>2×2 matrix</summary>

Prioritizing on two axes: impact and effort, urgency and importance.

```
                High impact
                     │
     Quick wins      │      Big bets
                     │
Low effort ──────────┼──────────► High effort
                     │
     Fill-ins        │      Money pits
                     │
                Low impact
```

</details>
<details>
<summary>Heatmap</summary>

Intensity over a grid: activity by day, load by hour, coverage by area.

```
        Mon Tue Wed Thu Fri
Week 1  ░░░ ▒▒▒ ▓▓▓ ███ ▒▒▒
Week 2  ▒▒▒ ▓▓▓ ███ ▓▓▓ ░░░
Week 3  ░░░ ░░░ ▒▒▒ ▓▓▓ ███

        ░ low  ▒  ▓  █ high
```

</details>
<details>
<summary>Gantt chart</summary>

A schedule in a PR or planning thread: who does what, when, and what overlaps.

```
           W1  W2  W3  W4  W5  W6  W7
Discovery  ████
Design         ████████
Build              ██████████████
QA                           ██████
Launch                             ██
```

</details>
<details>
<summary>Kanban board</summary>

Where work stands, column by column: a standup, a sprint review, a handover.

```
┌─ Todo ────────┐ ┌─ Doing ────┐ ┌─ Done ─────┐
│ ○ Spec        │ │ ◐ Search   │ │ ✓ Login    │
│ ○ Empty state │ │ ◐ Cards    │ │ ✓ Nav      │
│ ○ Copy        │ │            │ │ ✓ Footer   │
└───────────────┘ └────────────┘ └────────────┘
```

</details>

#### Code

<details>
<summary>Code callouts</summary>

Review comments that point at exact parts of a line, the way compiler errors do.

```
const hits = await search(q, { limit })
             ──┬──        ┬    ──┬──
               │          │      ╰── unset on load
               │          ╰── not trimmed
               ╰── blocks render
```

</details>
<details>
<summary>Line-number gutter</summary>

Quoting code with line numbers and pointing at the changed line.

```
 12 │ const results = search(query)
 13 │ if (!results.length) return empty   ◄ changed
 14 │ render(results)
```

</details>
<details>
<summary>Diff</summary>

A suggested change. Copy as Code Block uses ```diff, which GitHub colors red and green.

```diff
  const results = search(query)
- if (!results) return null
+ if (!results.length) return empty
  render(results)
```

</details>
<!-- /gen:templates -->

## Snippet cheat sheet

| Keyword | Glyph   | Use                                      |
| ------- | ------- | ---------------------------------------- |
| `!tee`  | `├── `  | tree branch (trailing spaces included)   |
| `!ell`  | `└── `  | last branch                              |
| `!pipe` | `│   `  | tree continuation / indent               |
| `!hl`   | `─`     | horizontal line                          |
| `!vl`   | `│`     | vertical line                            |
| `!ra`   | `→`     | then, leads to, becomes                  |
| `!la`   | `←`     | from, comes from                         |
| `!ua`   | `↑`     | up, increase                             |
| `!da`   | `↓`     | down, decrease                           |
| `!lra`  | `↔`     | both ways, sync                          |
| `!ret`  | `↳`     | sub-point, reply, nested item            |
| `!tri`  | `►`     | arrowhead for hand-drawn connectors      |
| `!ok`   | `✓`     | done, pass, yes                          |
| `!no`   | `✗`     | not done, fail, no                       |
| `!sel`  | `❯`     | selected option, prompt                  |

If you already have a snippet with one of these keywords, Raycast reports the clash on
import. Rename either one in Raycast.

Everything else is in Search Glyphs (see the [glyph gallery](#glyphs)). Each glyph's detail
pane shows its width and code points, and warns when a glyph depends on the font or has an
emoji form (`↔ ↕` do). Keys in Search Glyphs:

| Key   | Action |
| ----- | ------ |
| `↵`   | Paste (for spinners: paste the first frame) |
| `⌘↵`  | Copy (for spinners: all frames) |
| `⌘⇧C` | Copy a multi-line glyph, like a big arrow, as a code block |
| `⌘⇧K` | Copy the glyph's snippet keyword |
| `⌘⇧J` | Spinners: copy the frames as a JS array |
| `⌘⇧D` | Spinners: copy as `{ interval, frames }` |

Spinners animate in the preview while selected. Slack and GitHub can't animate text, so there
you'd paste one frame to mock a loading state, or the whole strip in a spec.

## Compose input reference

| Format   | Write this                                                   | Detected when                  |
| -------- | ------------------------------------------------------------ | ------------------------------ |
| Tree     | indented list: tabs, 2 or 4 spaces, `-`/`*` bullets. A tab or 2+ spaces after a label adds an aligned note | lines are indented or bulleted |
| Box      | any text; a `---` line becomes a divider                     | fallback                       |
| Table    | rows split by tabs, `\|`, 2+ spaces or commas; row 1 = header | columns line up                |
| Flow     | `A > B > C` (`->`, `→`, `=>` work too) or one step per line  | a single line with arrows      |
| Sequence | `A -> B: label` per line; `B --> A: reply` draws dashed      | every line is a message        |
| Plan     | `task start length` or `task 2-4` rows (Gantt); `date: label` rows (timeline) | rows of tasks with numbers, or dates first |
| Code     | code lines, then `target: note` lines (backticks around a target that contains a colon) | notes whose targets appear in the code |
| Text     | any text | never guessed: pick it yourself |
| Chart    | `label value` rows (tab, colon or spaces; `$`, `%`, `1,200` fine), or one line of numbers | every line ends in a number    |

Formats per kind:

| Kind  | Formats |
| ----- | ------- |
| Tree  | light, rounded, heavy, plain ASCII, top-down (org chart), nested boxes |
| Box   | light, rounded, heavy, double, titled (first line in the top border, light / rounded / heavy) |
| Table | box, rounded, plain, markdown, kanban board |
| Flow  | inline arrows, boxes across, boxes down, boxes down with heavy arrows |
| Chart | bars, columns, line, sparkline |
| Plan  | Gantt, timeline across, timeline down |
| Code  | callouts |
| Text  | bold, italic, bold italic, monospace, strikethrough, underline, banner (small caps, tall caps, tall mixed case) |

Tips:
- **Restyle an existing tree.** Select a drawn tree and pick another style: light, rounded, heavy, or plain ASCII for places that mangle Unicode.
- **Copy from a spreadsheet.** Cells copied from Sheets, Excel or Numbers arrive tab-separated, so they become a table directly.
- **Numbers align right.** Numeric columns get right-aligned, and markdown tables get a `--:` separator for them.

## Recipes

### File or folder structure

Type an indented list, then Compose → Tree · light.

```
src                          src
  components                 ├── components
    Button.tsx        →      │   ├── Button.tsx
    Card.tsx                 │   └── Card.tsx
  hooks                      ├── hooks
    useSearch.ts             │   └── useSearch.ts
  index.ts                   └── index.ts
```

### Component hierarchy

The same approach works for components. Rounded reads softer for UI.

To add a note, put a tab or 2+ spaces after a name. Notes line up in a column:

```
Page                                Page
  Header  sticky                    ├── Header               sticky
    Logo                            │   ├── Logo
    Account menu  avatar + menu  →  │   ╰── Account menu     avatar + menu
  Results  paged, 20 per page       ╰── Results              paged, 20 per page
    Result card × n                     ├── Result card × n
    Pagination                          ╰── Pagination
```

Leading whitespace is nesting and whitespace after the name is a column, so single spaces
inside a name (`Result card × n`) are kept. Restyling a drawn tree keeps its notes.

### Org chart

The same indented list, drawn top-down. Compose → Tree · top-down:

```
Lead
  Design
  Engineering
    Web
    Mobile
  Ops
```
```
                   ┌───────┐
                   │ Lead  │
                   └───┬───┘
     ┌─────────────────┼─────────────────┐
┌────┴────┐     ┌──────┴──────┐       ┌──┴──┐
│ Design  │     │ Engineering │       │ Ops │
└─────────┘     └──────┬──────┘       └─────┘
                 ┌─────┴─────┐
              ┌──┴──┐   ┌────┴────┐
              │ Web │   │ Mobile  │
              └─────┘   └─────────┘
```

Wide trees get wide quickly: past 72 columns the preview warns, and the regular tree is the fallback.

### Containment: what sits inside what

Compose → Tree · nested boxes turns the same list into boxes inside boxes. Borders change by
depth (double, light, rounded), so levels stay readable:

```
╔═ Page ══════════════╗
║ ┌─ Header ────────┐ ║
║ │ Logo            │ ║
║ │ Account menu    │ ║
║ └─────────────────┘ ║
║ ┌─ Results ───────┐ ║
║ │ Result card × n │ ║
║ └─────────────────┘ ║
║ Footer              ║
╚═════════════════════╝
```

### TUI panel

Compose → Box · titled puts the first line into the border:

```
┌─ Files ────┐┌─ Diff ─────────────────┐
│ ▾ src      ││   const q = input      │
│   ● app.ts ││ - search(q)            │
│ ▸ tests    ││ + search(q, { limit }) │
└────────────┘└────────────────────────┘
```

### UI wireframe

Diagram Templates → Layout wireframe. The double border is the page, light boxes are
components, and `[ ]` is a button.

```
╔══════════════════════════════════════════╗
║ Header                        [ Action ] ║
╠════════════╦═════════════════════════════╣
║ Sidebar    ║ Content                     ║
║            ║                             ║
║ › Item     ║ ┌─────────────┬───────────┐ ║
║ › Item     ║ │ Card        │ Card      │ ║
║ › Item     ║ └─────────────┴───────────┘ ║
║            ║                             ║
╚════════════╩═════════════════════════════╝
```

### Linear process

Write `Draft > Review > Approved > Published`, then Compose → Flow.

```
Draft → Review → Approved → Published

┌───────┐   ┌────────┐   ┌──────────┐   ┌───────────┐
│ Draft │──►│ Review │──►│ Approved │──►│ Published │
└───────┘   └────────┘   └──────────┘   └───────────┘
```

Use *boxes down* when the step names are long or there are more than about four steps.

### State machine with a loop back

Diagram Templates → State machine, then rename the states:

```
┌────────┐  submit  ┌──────────┐  approve  ┌──────────┐
│ Draft  │─────────►│ Review   │──────────►│ Approved │
└────────┘          └────┬─────┘           └──────────┘
     ▲                   │
     └───── reject ──────┘
```

### Who calls whom

Write one message per line, then Compose → Sequence · lanes:

```
Browser -> API: POST /search
API -> Index: query
Index --> API: hits
API --> Browser: 200 results
```
```
Browser               API                Index
   │                   │                   │
   │─ POST /search ───►│                   │
   │                   │─ query ──────────►│
   │                   │◄┄┄┄┄┄┄┄┄┄┄┄ hits ┄│
   │◄┄┄┄┄ 200 results ┄│                   │
   │                   │                   │
```

Also works for people and handoffs (`Design -> Eng: spec`), not just systems.
`A -> A: label` draws a self-call (`↻`).

### Comparing options

Paste rows from a sheet, or type them tab-separated, then Compose → Table:

```
┌────────────────┬────────┬────────┐
│ Option         │ Effort │ Risk   │
├────────────────┼────────┼────────┤
│ Patch in place │      1 │ Low    │
│ New service    │      5 │ Medium │
└────────────────┴────────┴────────┘
```

**Table · plain** aligns the same columns with spaces and a header rule, without borders.
It's the lightest option for Slack:

```
Option          Effort  Risk
──────────────  ──────  ──────
Patch in place       1  Low
New service          5  Medium
```

Box also aligns tab-separated lines into columns, so a boxed note can contain a small table.

For pros and cons, Diagram Templates → Compare A | B.

### Charts

Write `label value` rows, or paste two columns from a sheet, then Compose → Chart:

```
Design  ██████████████████████████████ 40
Build   █████████████████████▊         29
QA      █████████▍                     12.5
Launch  ██▎                            3
```

```
        45  38
        ███ ▁▁▁
    30  ███ ███
    ███ ███ ███
12  ███ ███ ███
▅▅▅ ███ ███ ███
███ ███ ███ ███
───────────────
Q1  Q2  Q3  Q4
```

```
 9.0 ┤            ╭──╮
 7.2 ┤         ╭──╯  ╰─╮
 5.3 ┤     ╭───╯       ╰──╮            ╭─
 3.5 ┼─────╯              ╰─╮         ╭╯
 1.7 ┤                      ╰─╮     ╭─╯
-0.2 ┤                        ╰─╮ ╭─╯
-2.0 ┤                          ╰─╯
      Mon                              Sat
```

A sparkline fits inline, in a sentence or a table cell: `▁▂▅█▇▄▂▃▆  3–14`.

Bars and columns start at zero, so for negative values use the line chart.

### Plans and roadmaps

A Gantt chart from `task start length` or `task 2-4` rows. An optional first line names the
unit (`Sprint`, `Week`, `Quarter`); part-units end in an eighth block:

```
Sprint
Discovery 1 1
Design 2-3
Build 3 3.5
Launch 6.5 0.5
```
```
           S1  S2  S3  S4  S5  S6
Discovery  ████
Design         ████████
Build              ██████████████
Launch                           ██
```

A timeline from `date: label` rows, across or down:

```
──●──────────●─────────────●──────────►
  Jan        Mar           Jun
  Kickoff    Public beta   Launch
```

```
Jan  ● Kickoff
     │
Mar  ● Public beta
     │
Jun  ● Launch
     ▼
```

A kanban board from a table, where the header row holds the columns (Compose → Table · kanban board):

```
┌─ Todo ─────┐ ┌─ Doing ────┐ ┌─ Done ─────┐
│ ○ Spec     │ │ ◐ Search   │ │ ✓ Login    │
│ ○ Copy     │ │            │ │ ✓ Nav      │
└────────────┘ └────────────┘ └────────────┘
```

### Before → after

Diagram Templates → Before → after. Edit each side in place. There are also versions with a
labeled heavy arrow, an outline arrow and a solid arrow.

```
┌─────────────┐     ┌─────────────┐
│ Before      │     │ After       │
├─────────────┤     ├─────────────┤
│ Page        │     │ Page        │
│   Header    │ ──► │   Header    │
│   Old panel │     │   New panel │
│   Footer    │     │   Footer    │
└─────────────┘     └─────────────┘
```

### Pointing at code

Write the code, then one `target: note` line per thing to point at. Compose → Code · callouts
draws the notes the way compiler errors do:

```
const total = items.reduce(sum)
items.reduce: throws on an empty array
sum: no initial value
```
```
const total = items.reduce(sum)
              ─────┬────── ─┬─
                   │        ╰── no initial value
                   ╰── throws on an empty array
```

A target is matched as a whole word first, so `a` points at the variable, not the a in `data`.
Code that contains colons stays code; wrap a target that has a colon in backticks.

### Styled text and banners

For places with no formatting, like LinkedIn posts, Slack channel topics and commit subjects.
Compose → Text:

```
𝗥𝗲𝗹𝗲𝗮𝘀𝗲 𝗻𝗼𝘁𝗲𝘀 𝘃𝟮
𝘙𝘦𝘭𝘦𝘢𝘴𝘦 𝘯𝘰𝘵𝘦𝘴 𝘷2
𝚁𝚎𝚕𝚎𝚊𝚜𝚎 𝚗𝚘𝚝𝚎𝚜 𝚟𝟸
R̶e̶l̶e̶a̶s̶e̶ n̶o̶t̶e̶s̶ v̶2̶
```

Three banner sizes. Small caps take 2 rows:

```
█▀█ █▀▀ █   █▀▀ ▄▀▄ █▀▀ █▀▀    █ █ ▀▀█
█▀▄ ██▄ █▄▄ ██▄ █▀█ ▄▄█ ██▄    ▀▄▀ █▄▄
```

Tall caps take 3 rows and are easier to read:

```
█▀▄ █▀▀ █   █▀▀ ▄▀▄ ▄▀▀ █▀▀    █ █ ▀▀▄
█▀▄ █▀  █   █▀  █▀█  ▀▄ █▀     ▀▄▀ ▄▀
▀ ▀ ▀▀▀ ▀▀▀ ▀▀▀ ▀ ▀ ▀▀  ▀▀▀     ▀  ▀▀▀
```

Tall mixed case keeps your capitalization, with real ascenders and descenders:

```
▄▀▄              ▄          █                  █      ▄
█▄▀ █ █ ▄▀█ ▄▀▀ ▀█▀ ██▀ ▄▀▀ █ █ █    █ █ █▀▄ ▄▀█ ▄▀█ ▀█▀ ██▀
 ▀▀  ▀▀  ▀▀ ▀    ▀▀  ▀▀ ▀   ▀ ▄█▀     ▀▀ █▀   ▀▀  ▀▀  ▀▀  ▀▀
```

Banners are stacked blocks, so like solid arrows they look solid where the font's blocks fill
the line height, and faintly striped where they don't.

These are Unicode look-alike letters: screen readers read them as math symbols or skip them,
and search won't find the words. Use them for a word or two, never for whole sentences.

### Asking for a decision

Diagram Templates → Option picker, the Claude Code style:

```
  How should we handle it?

❯ 1. Option one (Recommended)
     What it means and its trade-off.
  2. Option two
     What it means and its trade-off.
```

### Decision tree, checklist, progress

```
Is it blocking?
├── yes → Fix now
└── no
    ├── Affects many users? → Next sprint
    └── Edge case?          → Backlog
```
```
✓ Done item
◐ In progress
○ Not started
✗ Dropped: reason
```
```
Design    ████████████████████ 100%
Build     ████████████░░░░░░░░  60%
Testing   ████░░░░░░░░░░░░░░░░  20%
```

## Where it renders

Alignment only holds in a **monospace font**, so every diagram goes in a code block.
Inline glyphs (`→ ✓ · ↳`) are fine anywhere.

| Destination        | How                                                                  |
| ------------------ | -------------------------------------------------------------------- |
| Slack              | `⌘⇧C` in Compose copies it wrapped in ```. Or type ``` in the composer first, then paste |
| GitHub PR / issue  | ```` ```text ```` block (plain ``` works too)                        |
| Linear             | ``` block                                                            |
| Notion             | `/code` block, language *Plain Text*                                 |
| Terminal / code    | as-is                                                                |
| Email, Google Docs | proportional font, so alignment breaks. Use a screenshot, or keep it to inline glyphs |

Choosing the renderer: **GitHub and Notion render Mermaid natively**, so a flowchart in a PR
can be a real diagram there. Slack shows Mermaid as raw source, so text diagrams are the
portable choice.

## Pitfalls

**How much the font matters.** The kit aims to look right in any monospace font, but a few
glyph families depend on it:

| Family                                            | Behavior |
| ------------------------------------------------- | --------- |
| Straight box lines `─ │ ┌ ┼ ━ ┃ ═`                 | join in practically every font: the safe default |
| Diagonals `╱ ╲` (outline arrows, diamonds)        | some fonts stop them short of the cell corners, leaving small breaks |
| Blocks stacked vertically (solid arrows, column charts, banners) | solid where the font's blocks fill the line height, faintly striped where they don't |
| Blocks in a single row (bars, sparklines, progress) | fine everywhere |

The palette's detail pane carries the same caveats. When it matters, use the heavy arrow
family and the bar chart.

- **Emoji inside aligned art.**
  - ✅ 🚀 and the like are 2 columns wide. Compose measures them correctly, but a hand-edited diagram drifts.
  - `⚠ ☑ ✔ ▶` are worse: they're 1 or 2 columns depending on the app. The preview flags them.
  - Use `✓ ✗ ► ▼` in diagrams instead.
- **Tabs.** A tab is 2, 4 or 8 columns depending on the app. Compose converts tabs to spaces in its output, so keep it that way when editing by hand.
- **Width.** Keep diagrams under about 72 columns. Slack on a laptop wraps around 80–100, and on mobile much sooner. Raycast's preview pane wraps at about 56, which is why every template stays within 56 (a test enforces it).
- **Editing a generated diagram.** Change the source list and regenerate, rather than nudging box edges by hand.
- **Wrong font in the app.** If box edges look slightly off even in a code block, that app's monospace font lacks the glyph. The heavy and double styles are the most likely to show this; light is the safest.

## When to use something else

| Need                                                | Better tool                                  |
| --------------------------------------------------- | -------------------------------------------- |
| Freehand diagram: arbitrary boxes, routed arrows    | Monodraw (Mac app) or asciiflow.com          |
| Structure you can describe but not easily list      | Ask Claude: "draw this as a box diagram"     |
| A flowchart that only needs to render on GitHub or Notion | Mermaid                                |
| Zero-latency glyphs without snippet expansion       | Karabiner rule binding `⌥`+key to a glyph    |
| A canvas, multiple selections, drag-to-draw         | A native app. Revisit if this kit outgrows Raycast |

## Development

```
ascii-kit
├── src/
│   ├── data/glyphs.ts      palette + snippet keywords (single source of truth)
│   ├── data/templates.ts   templates; built from the generators where possible
│   ├── lib/                pure generators: tree, box, table, flow, sequence, chart,
│   │                       planning, orgchart, nested, callouts, textstyle, banner,
│   │                       plus shared width, columns, layout, canvas, arrows;
│   │                       *.test.ts next to them
│   ├── compose.tsx         Compose Diagram
│   ├── glyphs.tsx          Search Glyphs
│   └── templates.tsx       Diagram Templates
├── scripts/                snippets, README gallery, examples, font renders, icon
├── snippets/core.json      generated by `npm run snippets`
└── docs/DESIGN.md          design decisions, learnings, releasing, open ideas
```

| Task                  | How                                                                          |
| --------------------- | ---------------------------------------------------------------------------- |
| Add a glyph           | Add it to `glyphs.ts`. Give it a `keyword` only if you'll type it daily      |
| Regenerate snippets   | `npm run snippets`: rewrites `snippets/core.json` and fails on keyword prefix clashes. Re-import in Raycast |
| Add a template        | Add it to `templates.ts`. Use a generator for anything boxy                  |
| Regenerate the README gallery | `npm run readme`. `npm run readme -- --check` fails if it's stale (the source repo's CI runs it) |
| Check                 | `npm test` (generator fixtures), `npm run lint`, `npm run build`             |
| Compare fonts         | `npm run render-fonts -- in.txt out.png` draws a text file in Menlo, Monaco, SF Mono and Geist Mono at line heights 1.2 and 1.618, so you can judge a glyph design without pasting it anywhere |
| Preview every format  | `npm run examples` prints them all in a terminal (`npm run examples tree` for one kind) |
| Pick up code changes  | `npm run dev` again                                                          |
| Rebuild the icon      | `python3 scripts/gen-icon.py`                                                |

Why things are the way they are, and how releases to the Raycast Store work, is in
[docs/DESIGN.md](docs/DESIGN.md). Issues and pull requests are welcome.

## License

[MIT](LICENSE)
