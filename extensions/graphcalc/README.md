
# <img src="./assets/extension_icon.png" alt="Logo" width="25" style="vertical-align: middle;"> GraphCalc

A simple Raycast graphing calculator extension.

## Features

- **Arithmetic Operations**
  - Addition
  - Subtraction
  - Multiplication
  - Division

- **Trigonometric Functions**
  - Sine (`sin(x)`)
  - Cosine (`cos(x)`)
  - Tangent (`tan(x)`)

- **Other Graphing Capabilities**
  - **Interactive Navigation**
    - **Zoom In/Out**: Explore details or view the overall graph.
    - **Pan Left/Right/Up/Down**: Navigate to different regions of the graph.
    - **Reset View**: Quickly reset the graph to default settings.
  - **Themes**
    - The graph draws its own card, so it stays legible on any Raycast theme.
    - Choose from System (follows light/dark), Paper, Noir, Terminal, Blueprint and Synthwave.

- **Equation/Expression History**
  - Keeps track of previously entered equations and expressions for easy access.

## Actions

| Action | macOS | Windows |
| --- | --- | --- |
| Zoom In | `↵` | `↵` |
| Zoom Out | `⌘` `↵` | `Ctrl` `↵` |
| Move Up / Down / Left / Right | `⌘` `⇧` `↑` `↓` `←` `→` | `Ctrl` `Alt` `↑` `↓` `←` `→` |
| Reset View | `⌘` `⇧` `.` | `Ctrl` `Shift` `R` |
| Switch Theme | `⌘` `T` | `Ctrl` `T` |
| Next Theme | `⌘` `⇧` `;` | `Ctrl` `Shift` `T` |
| Copy Image | `⌘` `⇧` `C` | macOS only |
| Paste Image | `⌘` `⇧` `V` | macOS only |
| Save Image to Downloads | `⌘` `⇧` `S` | macOS only |
| Copy SVG | – | – |
| Edit Expression (history list) | `⌘` `E` | `Ctrl` `E` |
| Delete from History (history list) | `⌃` `X` | `Ctrl` `D` |

Windows uses different keys for panning, Reset View and Next Theme because Raycast for Windows reserves `Ctrl` `Shift` + arrows, and punctuation keys vary with the keyboard layout.

- **Zoom In/Out**: explore details or view the overall graph.
- **Move**: pan to a different region of the graph.
- **Reset View**: return to the default range.
- **Themes**: pick a theme from the `Switch Theme` submenu, or cycle with `Next Theme`.
- **Share**: copy, paste or save the current graph as a high-resolution PNG (macOS), or copy it as SVG (macOS and Windows).


## Preferences

### Plot Detail

How many points are sampled along the x-axis for each plot. Options: **Standard** (1,000 points, default), **High** (3,000), **Very High** (6,000) and **Maximum** (12,000). Change it in Raycast → Extensions → GraphCalc.

**When to raise it.** Only when a curve visibly misbehaves after zooming far out: fast oscillations look jagged or aliased (`sin(x^2)`, `x * sin(5x)` at wide ranges), or steep sections appear as dashes and gaps because consecutive samples are too far apart. Zoom in first, since that fixes it for free; use a higher detail level only when you need the wide view.

**What it costs.** Every zoom and pan re-evaluates the expression at every point and rebuilds the graph image, which is embedded in the view as data, so the image size grows in proportion to the point count (roughly 30 KB at Standard, 250 KB at Maximum). Higher settings make navigation noticeably less responsive, especially on slower machines and for heavy expressions, and produce larger `Copy SVG` output. Copy/Paste/Save Image are not affected in size: the PNG is fixed at 1600 pixels wide.

**Why Standard is the default.** The graph is 800 units wide and the plot area about 700, so 1,000 samples already exceed what can be displayed: more points cannot make a normal curve look better on screen, they only help in the extreme zoom-out cases above. Making everyone pay the extra redraw cost for a case most people never hit would be a poor trade, so the default stays at the level that is visually lossless for ordinary use.

## Tech Stack

**Client:** TypeScript, Raycast API

**Math Engine:** [Math.js](https://mathjs.org/)

**Rendering:** Custom SVG generation


## Authors

- [@cluzier](https://www.github.com/cluzier)

