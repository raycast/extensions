# crop

Crop images to a social media aspect ratio.

## Raycast command

The Raycast Command is `Social Media Cropper`. It uses a `Form` with a
multi-file picker, aspect-ratio text field, and position dropdown.

The implementation writes cropped files to a temporary directory under the
`delphitools-raycast-extension` namespace and then shows the generated files in
a `List`. It applies one shared ratio and position to all selected images. It
does not overwrite source files or ask for an output directory in v1.

## Inputs

- `IMAGES` optional variadic: input image paths.

## Options

- `--ratio <RATIO>`: aspect ratio, e.g. `1:1`, `4:5`, `16:9`; default `1:1`.
- `--position <POSITION>`: `center`, `top`, `bottom`, `left`, `right`, `top-left`, `top-right`, `bottom-left`, `bottom-right`; default `center`.
- Global: `--json`, `--quiet`, `--output`.

## Output

Cropped image files.

## Raycast parameters

- `images`: required file picker input. Allow multiple image files.
- `ratio`: required text field for the crop aspect ratio; default `1:1`.
  Accept values like `1:1`, `4:5`, `16:9`, and decimal `number:number` ratios.
- `position`: required dropdown with `center`, `top`, `bottom`, `left`,
  `right`, `top-left`, `top-right`, `bottom-left`, and `bottom-right`; default
  `center`.

## Validation

- At least one image is required.
- `ratio` must be a positive `number:number` value.

## Raycast actions

- `Social Media Cropper`: run `delphitools crop --quiet --ratio <ratio>
--position <position> --output <temp-directory>` with the selected files.
- `Open Cropped Image`: open the selected output file.
- `Copy Cropped Image`: copy the selected output file to the clipboard.
- `Copy Cropped Image Path`: copy the selected output file path.
- `Copy All Output Paths`: copy all generated file paths.
- `Reveal in Finder`: reveal the selected output file.
- `Reveal Output Folder`: reveal the temporary output directory.

## V2 ideas

- Add common aspect-ratio presets if the freeform field proves too loose.
- Add an optional output directory picker for users who want persistent files.
