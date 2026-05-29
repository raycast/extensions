# zine

Impose 8 images into a single-sheet mini-zine layout.

## Raycast command

The Raycast Command should be `Zine Imposer`. It should use a `Form` with a multi-file picker for exactly 8 images, a paper size dropdown, and a DPI input.

To make ordering predictable, the extension will automatically sort the selected image file paths alphabetically before passing them to the CLI. A Form description will guide the user to name files sequentially (e.g., `01.png`, `02.png` ... `08.png`) to control the page ordering.

Because this generates a single mini-zine layout PDF, the success view will display a `Detail` view showing PDF metadata and actions.

## Inputs

- `IMAGES` optional variadic: 8 page images in reading order, page 1 through page 8.

## Options

- `--paper <PAPER>`: output paper size; default `a4`.
- `--dpi <DPI>`: DPI for raster placement; default `300`.
- Global: `--json`, `--quiet`, `--output`.

## Output

Mini-zine PDF.

## Raycast parameters

- `images`: required file picker input. Choose exactly 8 image files.
- `paper`: dropdown for paper size: `a4` (default), `letter`, `a3`, `a5`.
- `dpi`: numeric text field for DPI raster placement; default `300`.

## Raycast actions

- `Impose Zine`: run `delphitools zine --paper <paper> --dpi <dpi> --quiet --output <temp-file> <images...>`.
- `Open Zine PDF`: open the generated PDF file.
- `Copy PDF File`: copy the generated PDF file to the clipboard.
- `Copy PDF Path`: copy the generated PDF file path.
- `Reveal in Finder`: reveal the generated PDF in Finder.
