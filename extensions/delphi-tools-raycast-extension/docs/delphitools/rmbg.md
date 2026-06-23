# rmbg

Remove background from images.

## Raycast command

The Raycast Command should be `Background Remover`. It should use a `Form` with a multi-file image picker. The description must warn the user that the first use will download a ~170 MB background-removal model, which may take a moment.

The command will execute `delphitools rmbg` with the selected images and automatically pass the `--approve` option to approve the model download. On submission, it shows an animated Toast: `"Removing background (Downloading model on first run)..."` when run for the first time.

Processed images are written to a temporary output directory, then displayed in a `List`.

## Inputs

- `IMAGES` optional variadic: input image paths.

## Options

- `--approve`: pre-approve the one-time model download; required in non-interactive mode.
- Global: `--json`, `--quiet`, `--output`.

## Output

Images with background removed.

## Raycast parameters

- `images`: required file picker input. Allow multiple image files.

## Raycast actions

- `Remove Background`: run `delphitools rmbg --approve --quiet --output <temp-directory> <images...>`.
- `Open Image`: open the selected output file.
- `Copy Image`: copy the selected output image file to the clipboard.
- `Copy Image Path`: copy the selected output file path.
- `Copy All Output Paths`: copy all generated file paths.
- `Reveal Output Folder`: reveal the temporary output directory.
- `Reveal in Finder`: reveal the selected output file in Finder.

## Notes

First use downloads an approximately 170 MB Apache-licensed ONNX model.
