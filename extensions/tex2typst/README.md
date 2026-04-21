# tex2typst

tex2typst lets you convert between TeX and Typst with a single Raycast action.

## Features

- Convert TeX to Typst (reads TeX from the clipboard, converts it to Typst, and replaces the clipboard content)
- Convert Typst to TeX (reads Typst from the clipboard, converts it to TeX, and replaces the clipboard content)
- Show success or failure notifications via Raycast toast

The conversion logic relies on the [`tex2typst`](https://github.com/qwinsi/tex2typst) library.

## Usage

1. Copy the text you want to convert to the clipboard.
   - To convert TeX to Typst: copy the TeX text and run “Convert TeX to Typst”.
   - To convert Typst to TeX: copy the Typst text and run “Convert Typst to TeX”.
2. After the command runs, the converted result overwrites the clipboard content.
3. Raycast toast notifications indicate whether the conversion succeeded or failed.

Notes:

- The extension runs in `no-view` mode, so no UI is rendered other than toast notifications.

## Commands

- Convert TeX to Typst (`convert-tex-to-typst`)
- Convert Typst to TeX (`convert-typst-to-tex`)

## Development

Install dependencies and start the development server:

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Lint:

```bash
npm run lint
npm run fix-lint
```

Publish to the Raycast Store:

```bash
npm run publish
```

## License

Apache License 2.0