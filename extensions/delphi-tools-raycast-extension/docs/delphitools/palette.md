# palette

Generate colour palettes using 28 strategies across 6 categories.

## Raycast command

The Raycast Command should be `Palette Generator`. It should be a
generator-first command that mirrors the web UI workflow: show the current
palette immediately, make strategy and size easy to change, and expose copy and
export actions from the result view.

The command should default to a random cohesive palette with 5 colours. The
result view should emphasise the generated swatches first, then list each colour
with its hex value and copy/lock actions. Locked colours should be represented
internally as the CLI `--lock` string, but users should not need to type that
string for normal use.

## Inputs

No positional input. Use options to select strategy and output shape.

## Options

- `--strategy <STRATEGY>`: strategy name, such as `analogous`, `80s`, or `ocean-sunset`; omit to list strategies.
- `--size <SIZE>`: number of colours, default `5`.
- `--format <FORMAT>`: `hex`, `css`, `json`, or `png`; default `hex`.
- `--lock <LOCK>`: lock palette slots, e.g. `0:#ff6600,3:#003366`.
- `--seed <SEED>`: reproducible generation seed.
- `--pretty`, `-p`: prefix colours with slot indexes.
- `--list`: list available strategies.
- Global: `--json`, `--quiet`, `--output`.

## Output

A generated palette as text, CSS, JSON, or PNG.

## Raycast parameters

- `strategy`: dropdown of available strategies grouped by category; default `random`.
- `size`: numeric text field; default `5`.
- `seed`: optional text field for reproducible output.
- `locks`: internal state for locked palette slots, serialized as `0:#ff6600,3:#003366` when calling the CLI.

## Raycast actions

- `Generate Palette`: generate or regenerate the palette with current strategy, size, seed, and locks.
- `Choose Strategy...`: open strategy choices grouped by category.
- `Increase Palette Size`: increase the palette size by one.
- `Decrease Palette Size`: decrease the palette size by one.
- `Copy Palette Colors`: copy all colours as newline-separated hex values.
- `Copy CSS Variables`: copy the palette as CSS custom properties.
- `Copy JSON`: copy the palette as JSON.
- `Export Palette Image`: generate a temporary PNG and copy or open it.
- `Copy Color`: copy the selected colour.
- `Lock Color`: lock the selected colour slot for regeneration.
- `Unlock Color`: unlock the selected colour slot.
- `Copy Lock String`: copy the CLI lock string for debugging or terminal use.

## V2 ideas

- Add editable locked colours through an `Edit Locked Color...` action.
- Add colour names and RGB/HSL metadata if the CLI or a local helper provides them.
- Add SVG export if the CLI gains a supported SVG output format.
- Add a richer strategy browser if users need to discover all 28 strategies before generating.
