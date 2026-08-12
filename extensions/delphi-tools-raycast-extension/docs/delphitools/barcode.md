# barcode

Generate 1D and 2D barcodes.

## Raycast command

The Raycast Command should be `Generate Barcode`. It should use a `Form`
because the user needs to enter data and tune a few generation parameters before
creating the image.

The Command should generate the barcode into a temporary PNG file by default,
then push a `Detail` view that previews the generated barcode. It should not ask
for a save path in the first implementation.

## Inputs

- `DATA` required: data to encode.

## Options

- `--format <FORMAT>`: `ean13`, `ean8`, `upca`, `code39`, `code128`, `codabar`, `code93`, or `itf`; default `code128`.
- `--height <HEIGHT>`: bar height in pixels; default `120`.
- `--scale <SCALE>`: width scale in pixels per module; default `2`.
- `--text`: include human-readable text below the barcode. The current installed CLI build reports that this option is not supported because no bundled font is available, so omit it from the first Raycast UI.
- Global: `--json`, `--quiet`, `--output`.

## Output

Barcode image.

## Raycast parameters

- `data`: required text input for the encoded data.
- `format`: dropdown with `ean13`, `ean8`, `upca`, `code39`, `code128`, `codabar`, `code93`, and `itf`; default `code128`.
- `height`: numeric text field; default `120`.
- `scale`: numeric text field; default `2`.

## Raycast actions

- `Generate Barcode`: run `delphitools barcode --quiet --output <temp-file>` with the chosen parameters.
- `Open Barcode Image`: open the generated temporary PNG.
- `Copy Barcode Image`: copy the generated image file to the clipboard.
- `Copy Barcode Image Path`: copy the temporary PNG path.
- `Copy Barcode Data`: copy the source data.

## V2 ideas

- Add a human-readable text toggle when the CLI supports `--text` in the installed build.
- Add an explicit save action or output path picker.
- Add root-search arguments for `data` and `format` if the generated command stays ergonomic.
