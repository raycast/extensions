# Markup to Docs

Raycast AI extension for generating `pdf`, `docx`, `odt`, or `rtf` files from HTML and optional CSS.

## Features

- AI tool: `generate-document`
- Manual command: `Markup to Docs` (file picker flow)
- Required inputs: `html`, `fileType`, `outputDirectory`
- Optional inputs: `css`, `fileName`

## Conversion

- `pdf` uses Puppeteer for high-fidelity HTML/CSS rendering
- `docx`, `odt`, and `rtf` use macOS `textutil`

## Development

```bash
npm install
npm run lint
npm run build
npm run dev
```
