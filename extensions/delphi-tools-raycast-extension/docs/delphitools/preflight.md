# preflight

Analyse a PDF for print-readiness issues.

## Raycast command

The Raycast Command should be `PDF Preflight`. It should use a `Form` with a
single PDF file picker, then show a structured `Detail` report.

The report should match the web UI information architecture where possible:
overall status, warning/info/error counts, PDF metadata, page size, per-page
issues, and issues grouped by category. Page preview should stay out of v1
unless the CLI provides preview data or rendering support.

## Inputs

- `PDF` required: PDF file path.

## Options

- Global: `--json`, `--quiet`, `--output`.

## Output

Print-readiness report.

## Raycast parameters

- `pdf`: required file picker input. Choose one PDF file.

## Raycast actions

- `Run PDF Preflight`: run `delphitools preflight --json --quiet <pdf>`.
- `Copy Report`: copy the rendered markdown/text report.
- `Copy JSON Report`: copy the raw JSON report.
- `Open PDF`: open the source PDF.
- `Reveal in Finder`: reveal the source PDF.

## Report sections

- Status summary: ready for print, warnings, info, and errors.
- PDF metadata: PDF version, pages, file size, encrypted status, and font summary when available.
- Page details: page size and per-page issues.
- Issues by category: document, geometry, image, font, colour, or other categories returned by the CLI.

## V2 ideas

- Add page preview thumbnails if a local PDF rendering path is added.
- Add severity filters for large reports.
- Add export actions for a persistent report file.
