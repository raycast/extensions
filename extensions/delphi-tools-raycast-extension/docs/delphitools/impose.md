# impose

Impose a PDF for booklet, saddle-stitch, or n-up printing.

## Inputs

- `PDF` required: source PDF path.

## Options

- `--layout <LAYOUT>`: `saddle-stitch`, `perfect-bind`, or `n-up`; default `saddle-stitch`.
- `--paper <PAPER>`: output paper size; default `a4`.
- `--n-up <N_UP>`: pages per sheet for n-up; default `4`.
- `--signature <SIGNATURE>`: pages per signature for perfect-bind; default `16`.
- `--margins <MARGINS>`: margin in mm; default `10`.
- `--gutter <GUTTER>`: gutter in mm; default `5`.
- `--creep <CREEP>`: creep compensation in mm; default `0`.
- `--crop-marks`: draw crop marks.
- `--duplex`: add duplex back-sheet pages.
- Global: `--json`, `--quiet`, `--output`.

## Output

Imposed PDF.

## Raycast Command

`Print Imposer` wraps `delphitools impose` as a file-output Command for preparing PDFs for booklet, perfect-bound, or n-up printing.

## Raycast Parameters

- `PDF`: required single-file picker; accepts `.pdf`.
- `Layout`: supported CLI layouts with print-oriented labels:
  - `2-up Saddle Stitch` -> `saddle-stitch`
  - `2-up Perfect Bind` -> `perfect-bind`
  - `N-up Gang Run` -> `n-up`
- `Paper`: `A4`, `A3`, `Letter`, `Legal`, or `Tabloid`; default `A4`.
- `N-up Count`: whole number; default `4`.
- `Signature Size`: whole number; default `16`.
- `Margins`: millimeters; default `10`.
- `Gutter`: millimeters; default `5`.
- `Creep`: millimeters; default `0`.
- `Crop Marks`: toggles `--crop-marks`.
- `Duplex`: toggles `--duplex`.

The command includes a web-inspired preview action for each supported CLI layout. The preview is illustrative only; output geometry is controlled by `delphitools`.

## Raycast Actions

- `Impose PDF`: writes an imposed PDF to a temporary output file.
- `Show Layout Preview`: opens an illustrative preview for the selected supported layout.
- `Open Imposed PDF`: opens the generated PDF.
- `Copy Imposed PDF`: copies the generated PDF file.
- `Copy Imposed PDF Path`: copies the generated path.
- `Reveal in Finder`: reveals the generated PDF.

## CLI Mapping

The Command runs:

```sh
delphitools impose --quiet \
  --layout <layout> \
  --paper <paper> \
  --n-up <n-up> \
  --signature <signature> \
  --margins <margins> \
  --gutter <gutter> \
  --creep <creep> \
  [--crop-marks] \
  [--duplex] \
  --output <temp-file.pdf> \
  <pdf>
```

## v2 Notes

Potential web-only layouts are not exposed until the CLI supports them:

- `2-up Step & Repeat`
- `4-up Booklet (Quarter Fold)`
- `Custom N-up`
