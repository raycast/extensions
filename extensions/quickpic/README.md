# QuickPic

QuickPic is a Raycast extension that lets you save images under keywords and later paste them as files into any app.

## Commands

- `QuickPic Library`: search your saved images and paste or copy them as files
- `Add Image`: import an image from a local path
- `Add Selected Finder Image`: import the currently selected Finder image using command arguments

## How it works

- Imported image files are copied into the extension support directory (`environment.supportPath`)
- Metadata is stored in Raycast Local Storage as a JSON index
- Pasting uses Raycast's Clipboard API with `{ file: ... }`, so target apps receive an actual file attachment

## Development

According to the current Raycast docs, extension development requires Node.js 22.14 or higher.

```bash
npm install
npm run dev
```

Then use Raycast's `Import Extension` command and point it at this folder if Raycast does not auto-import it during development.
