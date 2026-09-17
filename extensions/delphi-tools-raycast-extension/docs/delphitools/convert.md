# convert

Convert images between formats with optional resize.

## Raycast command

The Raycast Command should be `Convert Images`. It should use a `Form` with a
multi-file picker, target-format dropdown, quality field, and optional resize
field.

The first implementation should write converted files to a temporary directory
and then show the generated files in a `List`. It should not overwrite source
files or ask for an output directory in v1.

## Inputs

- `IMAGES` optional variadic: input image paths.
- `--to <TO>` required: target format.

## Options

- `--to <TO>`: `png`, `jpeg`, `jpg`, `webp`, `gif`, `tiff`, `bmp`, or `ico`.
- `--quality <QUALITY>`: JPEG/WebP quality `1` to `100`; default `85`.
- `--resize <RESIZE>`: `WxH`, `Wx`, `xH`, or `P%`, e.g. `800x600` or `50%`.
- Global: `--json`, `--quiet`, `--output`.

## Output

Converted image files.

## Raycast parameters

- `images`: required file picker input. Allow multiple files.
- `to`: required dropdown with `png`, `jpeg`, `jpg`, `webp`, `gif`, `tiff`, `bmp`, and `ico`.
- `quality`: optional numeric text field for JPEG and WebP quality; default `85`.
- `resize`: optional text field that accepts `WxH`, `Wx`, `xH`, or `P%`, for example `800x600`, `800x`, `x600`, or `50%`.

## Raycast actions

- `Convert Images`: run `delphitools convert --quiet --to <format> --quality <quality> --output <temp-directory>` with the selected files and optional resize.
- `Open Converted Image`: open the selected output file.
- `Copy Converted Image`: copy the selected output file to the clipboard.
- `Copy Converted Image Path`: copy the selected output file path.
- `Copy All Output Paths`: copy all generated file paths.
- `Reveal in Finder`: reveal the selected output file.

## V2 ideas

- Add support for selected Finder files as input when it can be tested cleanly.
- Add an optional output directory picker for users who want persistent files.
- Replace the compact resize text field with structured resize controls if users need more guardrails.
- Add format-specific affordances, such as hiding quality when the target format does not use it.
