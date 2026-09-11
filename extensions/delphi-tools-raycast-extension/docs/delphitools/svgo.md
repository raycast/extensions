# svgo

Optimise SVG files.

## Raycast command

The Raycast Command should be `SVG Optimiser`. It should use a `Form` that accepts input via two methods:

1. **SVG File Picker**: A multi-file picker to choose existing SVG files.
2. **SVG Code Text Area**: A multi-line text area to paste SVG XML code directly.

The form will validate that at least one input is provided. If both are provided, it will optimize both (or prioritize according to execution rules).

### Results view

- **File mode**: Displays optimized files in a `List` with previews and actions to copy the SVG content, open the SVG, copy the file, and reveal the output.
- **Code mode**: Displays a single optimized SVG in a `Detail` view showing:
  - An inline markdown preview of the optimized SVG.
  - A text block containing the optimized SVG XML string.
  - Actions to copy the optimized SVG code, download/save it to a file, and reveal the temporary path.

## Inputs

- `FILES` optional variadic: SVG file paths.

## Options

- Global: `--json`, `--quiet`, `--output`.

## Output

Optimised SVG files.

## Raycast parameters

- `files`: file picker input (optional if SVG code is provided). Allow multiple SVG files.
- `svgCode`: text area input (optional if SVG files are chosen). Paste raw SVG XML code.

## Raycast actions

- `Optimise SVG Files`: run `delphitools svgo --quiet --output <temp-directory> <files...>`.
- `Copy SVG Content`: copy the optimized SVG XML string directly to the clipboard.
- `Download / Save Optimized SVG`: prompt the user to save the optimized SVG from pasted code to a chosen location.
- `Open SVG`: open the selected optimized SVG.
- `Copy SVG File`: copy the selected optimized `.svg` file to the clipboard.
- `Reveal Output Folder`: reveal the temporary output directory.
- `Reveal in Finder`: reveal the selected optimized SVG file in Finder.
