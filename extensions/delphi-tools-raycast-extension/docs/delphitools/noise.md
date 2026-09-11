# noise

Add colour noise overlay to artwork.

## Raycast command

The Raycast Command should be `Add Noise to Images`. It should use a `Form`
with a multi-file image picker, opacity field, scale field, and optional seed
field.

The first implementation should write noisy images to a temporary output
directory and then show the generated files in a `List`. It should not overwrite
source files or ask for an output directory in v1.

## Inputs

- `IMAGES` optional variadic: input image paths.

## Options

- `--opacity <OPACITY>`: `0.0` to `1.0`; default `0.15`.
- `--scale <SCALE>`: noise scale where `1.0` means 1px grain; default `1.0`.
- `--seed <SEED>`: reproducible random seed.
- Global: `--json`, `--quiet`, `--output`.

## Output

Image files with noise overlay.

## Raycast parameters

- `images`: required file picker input. Allow multiple image files.
- `opacity`: numeric text field from `0.0` to `1.0`; default `0.15`.
- `scale`: numeric text field greater than `0`; default `1.0`.
- `seed`: optional text field for reproducible output.

## Raycast actions

- `Add Noise to Images`: run `delphitools noise --quiet --output <temp-directory>` with the selected images and parameters.
- `Open Noisy Image`: open the selected output file.
- `Copy Noisy Image`: copy the selected output file to the clipboard.
- `Copy Noisy Image Path`: copy the selected output file path.
- `Copy All Output Paths`: copy all generated file paths.
- `Reveal Output Folder`: reveal the temporary output directory.
- `Reveal in Finder`: reveal the selected output file.

## V2 ideas

- Add support for selected Finder files as input when it can be tested cleanly.
- Add an optional persistent output directory picker.
- Add side-by-side before/after preview if Raycast image preview performance is acceptable.
