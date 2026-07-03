# font-info

Extract metadata from a font file.

## Raycast command

`Font File Explorer` is implemented as a Raycast `Form` with a single font file
picker. It accepts one local `ttf`, `otf`, `woff`, or `woff2` file.

The command checks for the local `delphitools` CLI before showing the form. When
submitted, it runs:

```sh
delphitools font-info --json --quiet <font>
```

The JSON response is shown in a structured `Detail` view. Common name fields are
summarized first, then every returned JSON field is rendered recursively so the
view keeps working when the CLI adds or changes metadata fields.

## Inputs

- `FONT` required: one `ttf`, `otf`, `woff`, or `woff2` font file.

## Options

- Global: `--json`, `--quiet`, `--output`.

## Output

Font metadata as JSON from the CLI, rendered as structured markdown in Raycast.

## Raycast parameters

- `font`: required file picker input. Allows one `ttf`, `otf`, `woff`, or
  `woff2` font file.

## Raycast actions

- `Font File Explorer`: run `delphitools font-info --json --quiet <font>` and
  show the result as structured markdown.
- `Copy Font Metadata JSON`: copy the full pretty-printed JSON output.
- `Copy Font Summary`: copy a concise human-readable summary with common font
  family, style, full name, version, and source file path when available.
- `Reveal in Finder`: reveal the selected font file.

## V2 ideas

- Add a searchable metadata-field List if the JSON output has stable field names
  worth copying individually.
- Add root-search arguments for direct file paths if that becomes useful.
- Add richer grouping for name-table, technical, and license metadata if the CLI
  output supports it.
