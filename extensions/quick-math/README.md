<div align="center">
  <img src="assets/circular-integral.png" width="128" height="128" alt="Quick Math Icon" />
  <h1>Quick Math</h1>
  <p><strong>Raycast extension that render LaTeX and Typst formulas locally on macOS and copy them as transparent PNGs.</strong></p>
</div>

---

**Quick Math** is a [Raycast](https://www.raycast.com/) extension that turns LaTeX or Typst formulas into crisp, transparent PNGs (512 DPI) ready for your clipboard. Perfect for pasting formatted math expressions directly into notes, slides, documents, or chat apps.

## Features

- 💻 **Local & Offline**: Renders entirely on your machine—fast, private, and works without an internet connection.
- 🎭 **Dual Engine Support**: Switch between **LaTeX** (default) and **Typst** math syntax.
- 😼 **Adaptive Preview**: Real-time previews supporting both light and dark themes in Raycast.
- ✂️ **Tightly Cropped Output**: High-resolution (512 DPI) transparent PNGs with tight bounding boxes.
- 🛠️ **Custom Preamble**: Easily include your favorite LaTeX packages (`mathtools`, `physics`, `bm`, etc.) and macro definitions.

## Requirements

Ensure the following prerequisites are installed on your Mac before using Quick Math:

### General
- macOS
- [Raycast](https://www.raycast.com/)

### For LaTeX Mode (Default)
The extension directly calls binaries under `/Library/TeX/texbin`:
- **Executables**:
  - `/Library/TeX/texbin/latex`
  - `/Library/TeX/texbin/dvipng`
- **TeX Packages**:
  - `amsmath`
  - `amssymb`
  *(plus any packages specified in your custom preamble)*

### For Typst Mode
- **Executable**:
  - `typst` CLI available in Raycast's `$PATH`

## Usage

1. Open **Quick Math** in Raycast (or launch via your assigned hotkey).
2. Enter your formula:
   - **LaTeX**: Type expressions directly (e.g., `\int_{-\infty}^{\infty} e^{-x^2} \, dx = \sqrt{\pi}`). Document structure and math environments are wrapped automatically.
   - **Typst**: Type Typst math expressions (e.g., `frac(a, b)` or `integral_0^oo e^(-x^2) dif x = sqrt(pi)`).
3. Press **Enter** to copy the rendered transparent PNG.
4. Paste it with **Cmd + V** into any app.

## Preferences

Configure options in **Raycast Settings → Extensions → Quick Math**:

| Setting | Type | Description |
|---|---|---|
| **Rendering Engine** | Dropdown | Choose between `LaTeX` (default) and `Typst`. |
| **Custom Preamble** | Text | *(LaTeX only)* Additional packages or macro definitions (e.g. `\usepackage{mathtools,physics,bm} \newcommand{\R}{\mathbb{R}}`). Inserted after `amsmath` and `amssymb`. |

## Development

```sh
# Install dependencies
npm install

# Start local extension in Raycast
npm run dev

# Run linter and build
npm run lint
npm run build
```

## Credits

Quick Math is based on [LaTeX to Image (Quick LaTeX)](https://www.raycast.com/Noamko/quick-latex), originally created by [Noamko](https://github.com/Noamko). Quick Math adds local rendering and Typst support, with transparent PNG as the clipboard format.

- **Current Maintainer**: [Harumaru169](https://github.com/Harumaru169)
- **Original Author**: [Noamko](https://github.com/Noamko)
- **Contributors**: [FariaF22](https://github.com/FariaF22)

## License

Distributed under the [MIT License](LICENSE).
