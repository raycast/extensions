# matte

Place a non-square image on a square or aspect-ratio matte.

## Inputs

- `IMAGES` optional variadic: input image paths.

## Options

- `--ratio <RATIO>`: output aspect ratio; default `1:1`.
- `--mode <MODE>`: `solid`, `blur`, or `gradient`; default `blur`.
- `--colour <COLOUR>`: background colour for solid matte; default `#ffffff`.
- Global: `--json`, `--quiet`, `--output`.

## Output

Matted image files.

## Raycast Command

`Matte Generator` creates matted image files from one or more selected images.
It uses a Form for input and a List for generated output previews.

## Raycast Parameters

- `Images`: required multi-file picker.
- `Style`: `Blur`, `Solid`, or `Gradient`; default `Blur`.
- `Aspect Ratio`: `1:1`, `4:5`, `3:4`, `9:16`, or `Custom`; default `1:1`.
- `Custom Ratio`: shown only for custom aspect ratio; accepts `width:height`.
- `Background Colour`: shown only for solid style; default `#ffffff`.

## Raycast Actions

- `Open Matted Image`
- `Copy Matted Image`
- `Copy Matted Image Path`
- `Copy All Output Paths`
- `Reveal Output Folder`
- `Reveal in Finder`

## CLI Mapping

The Command writes to a temporary output directory and runs:

```sh
delphitools matte --quiet --ratio <ratio> --mode <mode> --output <temp-directory> [--colour <colour>] <images...>
```

`--colour` is only passed for solid mattes.

## Notes

The live CLI supports ratio, mode, colour, JSON, quiet, and output flags. Web-only
controls such as output width and padding are intentionally omitted until the CLI
supports them or the extension adds its own image post-processing.
