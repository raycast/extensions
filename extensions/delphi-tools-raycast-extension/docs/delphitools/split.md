# split

Split an image into a grid of tiles.

## Raycast command

The Raycast Command should be `Split Image into Tiles` (listed as "Image Splitter" in the tool list). It should use a `Form` with a single file picker, and text fields for rows and columns.

Processed tiles are written to a temporary output directory and displayed in a `List`.

## Inputs

- `IMAGE` required: input image path.

## Options

- `--rows <ROWS>`: number of rows; default `1`.
- `--cols <COLS>`: number of columns; default `1`.
- Global: `--json`, `--quiet`, `--output`.

## Output

Tile image files.

## Raycast parameters

- `image`: required file picker input. Choose one image file.
- `rows`: integer text field for the number of rows; default `1`.
- `cols`: integer text field for the number of columns; default `1`.

## Raycast actions

- `Split Image`: run `delphitools split --quiet --output <temp-directory> <image>`.
- `Open Tile`: open the selected tile image.
- `Copy Tile`: copy the selected tile image file to the clipboard.
- `Copy Tile Path`: copy the selected tile file path.
- `Copy All Tile Paths`: copy a list of all generated tile paths.
- `Reveal Output Folder`: reveal the temporary output directory.
- `Reveal in Finder`: reveal the selected tile file in Finder.
