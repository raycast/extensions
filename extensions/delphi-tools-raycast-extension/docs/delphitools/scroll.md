# scroll

Split a wide image into carousel tiles for Instagram.

## Raycast command

The Raycast Command should be `Generate Seamless Scroll` (listed as "Seamless Scroll Generator" in the tool list). It should use a `Form` with a single file picker, an aspect ratio input/selector, a fill mode dropdown, and a color input (visible only when fill mode is set to color).

Processed tiles are written to a temporary output directory and displayed in a `List`.

## Inputs

- `IMAGE` required: input image path.

## Options

- `--ratio <RATIO>`: tile aspect ratio; default `4:5`.
- `--fill <FILL>`: `blur` or `colour`; default `blur`.
- `--colour <COLOUR>`: fill colour; default `#ffffff`.
- Global: `--json`, `--quiet`, `--output`.

## Output

Carousel tile image files.

## Raycast parameters

- `image`: required file picker input. Choose one image file.
- `ratio`: aspect ratio text field or dropdown; default `4:5`.
- `fill`: dropdown for fill mode: `blur` (default) or `colour`.
- `colour`: text field for hex/RGB fill color (default `#ffffff`, active/relevant when fill mode is `colour`).

## Raycast actions

- `Generate Seamless Scroll`: run `delphitools scroll --quiet --output <temp-directory> <image>`.
- `Open Tile`: open the selected tile image.
- `Copy Tile`: copy the selected tile image file to the clipboard.
- `Copy Tile Path`: copy the selected tile file path.
- `Copy All Tile Paths`: copy a list of all generated tile paths.
- `Reveal Output Folder`: reveal the temporary output directory.
- `Reveal in Finder`: reveal the selected tile file in Finder.
