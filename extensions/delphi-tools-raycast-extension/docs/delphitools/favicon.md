# Favicon Generator

Generate multi-size favicons from a source image.

## Raycast command

`Favicon Generator` is a Raycast `Form` command that accepts one source image,
an editable favicon size list, and an ICO toggle. It writes generated files to a
temporary output directory and shows the results in a `List`.

## Inputs

- `IMAGE` required: source image path.

## Options

- `--sizes <SIZES>`: comma-separated sizes; default `16,32,48,180,512`.
- `--ico`: also emit a multi-size `favicon.ico`.
- Global: `--json`, `--quiet`, `--output`.

## Output

Favicon image files and optionally an ICO file.

## Raycast parameters

- `image`: required file picker input. Allow one image file.
- `sizes`: required text field for comma-separated favicon sizes; default
  `16,32,48,180,512`.
- `ico`: checkbox that controls whether to generate `favicon.ico`; default
  enabled.

## Raycast actions

- `Favicon Generator`: run `delphitools favicon --quiet --sizes <sizes>
[--ico] --output <temp-directory> <image>`.
- `Open Favicon`: open the selected output file.
- `Copy Favicon`: copy the selected output file to the clipboard.
- `Copy Favicon Path`: copy the selected output file path.
- `Copy All Output Paths`: copy all generated file paths.
- `Reveal in Finder`: reveal the selected output file.
- `Reveal Output Folder`: reveal the temporary output directory.

## Validation

- Image is required.
- Sizes must be comma-separated positive integers.

## Temporary files

Outputs are written under the system temp directory in the
`delphitools-raycast-extension` namespace with a `favicon-` directory prefix.
The command does not overwrite source files and does not ask for a persistent
output directory.

## V2 ideas

- Add common preset size groups for web app, Apple touch icon, and PWA
  workflows.
- Add an optional output directory picker for users who want persistent files.
- Add validation or preview warnings for source images that are too small for
  the requested sizes.
