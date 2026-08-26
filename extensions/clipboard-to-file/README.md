# Clipboard to File

A Raycast extension that saves the current clipboard to `<destination folder>/<label>`. The destination folder is configurable in the extension settings and defaults to `/Users/Shared`.

- Text clipboard contents are written as UTF-8.
- If the clipboard contains a copied file, the file itself is copied.
- Existing destination files are overwritten.
- Labels must be single filenames (not paths).

## Install for development

```bash
npm install
npm run dev
```

Then run **Write Clipboard to File** in Raycast and enter a label.
