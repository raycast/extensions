# Markdown to PDF Raycast Extension

Convert local Markdown files into styled PDF documents from Raycast.

## What it does

- Uses the current Finder-selected Markdown file.
- Renders headings, lists, tables, quotes, links, code blocks, and task lists.
- Prints the rendered HTML to PDF through a local Chromium-based browser.
- Saves the PDF next to the source file with the same filename.

## Browser requirement

PDF generation uses a locally installed Chromium-based browser in headless mode.
Supported browsers include:

- Google Chrome
- Arc
- Brave
- Microsoft Edge
- Chromium

If you use a non-default install location, set the extension preference for `Chromium Browser`.

## Usage

1. Select a `.md` file in Finder.
2. Run `Convert Markdown to PDF` in Raycast.
3. The PDF is written next to the Markdown file with the same basename.

## Development

```bash
npm install
npm run typecheck
npm run build
```
