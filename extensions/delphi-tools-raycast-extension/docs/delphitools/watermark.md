# watermark

Composite a watermark onto images.

## Raycast command

The Raycast Command should be `Watermark Images` (listed as "Watermarker" in the tool list). It should use a `Form` with a multi-file picker for the main images, a single-file picker for the watermark image, a position dropdown, an opacity text field, and a scale text field.

Watermarked images are written to a temporary output directory and shown in a `List`.

## Inputs

- `IMAGES` optional variadic: input image paths.
- `--mark <MARK>` required: watermark image path.

## Options

- `--position <POSITION>`: `top-left`, `top`, `top-right`, `left`, `center`, `right`, `bottom-left`, `bottom`, `bottom-right`; default `bottom-right`.
- `--opacity <OPACITY>`: `0.0` to `1.0`; default `0.3`.
- `--scale <SCALE>`: watermark scale relative to longest input edge; default `0.2`.
- Global: `--json`, `--quiet`, `--output`.

## Output

Watermarked image files.

## Raycast parameters

- `images`: required file picker input. Allow multiple image files.
- `mark`: required file picker input. Choose one watermark image file.
- `position`: dropdown for watermark placement: `bottom-right` (default), `bottom`, `bottom-left`, `right`, `center`, `left`, `top-right`, `top`, `top-left`.
- `opacity`: numeric text field between `0.0` and `1.0`; default `0.3`.
- `scale`: numeric text field between `0.0` and `1.0` (watermark size relative to longest edge); default `0.2`.

## Raycast actions

- `Apply Watermark`: run `delphitools watermark --mark <mark> --quiet --output <temp-directory> <images...>`.
- `Open Watermarked Image`: open the selected output file.
- `Copy Watermarked Image`: copy the selected output file to the clipboard.
- `Copy Image Path`: copy the selected output file path.
- `Copy All Output Paths`: copy all generated file paths.
- `Reveal Output Folder`: reveal the temporary output directory.
- `Reveal in Finder`: reveal the selected output file in Finder.
