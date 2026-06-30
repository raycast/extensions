# trace

Trace raster images to SVG vectors.

## Raycast command

The Raycast Command should be `Trace Image to SVG` (listed as "Image Tracer" in the tool list). It should use a `Form` with a single file picker, preset dropdown, optional colors input, and optional blur input.

Because tracing generates a single vector SVG output, the success view should be a premium `Detail` view rendering metadata and markdown file details.

## Inputs

- `IMAGE` required: raster image path.

## Options

- `--preset <PRESET>`: `default`, `detailed`, or `posterize`; default `default`.
- `--colours <COLOURS>`: number of colours; overrides preset.
- `--blur <BLUR>`: pre-blur radius; default `0`.
- Global: `--json`, `--quiet`, `--output`.

## Output

SVG vector output.

## Raycast parameters

- `image`: required file picker input. Choose one image file.
- `preset`: dropdown for tracing presets: `default` (default), `detailed`, `posterize`.
- `colours`: optional numeric text field representing color count (overrides preset).
- `blur`: optional numeric text field for pre-blur radius; default `0`.

## Raycast actions

- `Trace Image`: run `delphitools trace --quiet --output <temp-file> <image>`.
- `Copy SVG XML Code`: copy the raw XML code (`<svg>...`) of the generated vector.
- `Open SVG`: open the generated SVG file.
- `Copy SVG File`: copy the generated vector file to the clipboard.
- `Copy SVG Path`: copy the generated file path.
- `Reveal in Finder`: reveal the generated SVG file in Finder.
