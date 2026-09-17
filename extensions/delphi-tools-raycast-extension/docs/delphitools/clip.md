# clip

Trim transparent edges from PNG images.

## Raycast command

The Raycast Command should be `Trim Transparent Edges`. It should use a `Form`
with a multi-file picker because the CLI accepts one or more PNG images.

The first implementation should write output to a temporary directory and then
show the generated files in a `List`. It should not overwrite source files or ask
for an output directory in v1.

## Inputs

- `IMAGES` optional variadic: PNG image paths.

## Options

- Global: `--json`, `--quiet`, `--output`.

## Output

Trimmed PNG files.

## Raycast parameters

- `images`: required file picker input. Allow multiple files. Accept PNG files only.

## Raycast actions

- `Trim Transparent Edges`: run `delphitools clip --quiet --output <temp-directory>` with the selected files.
- `Open Trimmed Image`: open the selected output file.
- `Copy Trimmed Image`: copy the selected output file to the clipboard.
- `Copy Trimmed Image Path`: copy the selected output file path.
- `Copy All Output Paths`: copy all generated file paths.
- `Reveal in Finder`: reveal the selected output file.

## V2 ideas

- Add support for selected Finder files as input when it can be tested cleanly.
- Add an optional output directory picker for users who want persistent files.
- Add a replace-source workflow only if Raycast makes confirmation and error recovery explicit.
