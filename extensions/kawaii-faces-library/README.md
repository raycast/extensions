# Kawaii Faces

Raycast extension for browsing cute text faces and copying them instantly.

## Run it

```bash
npm install
npm run dev
```

## What it does

- Shows a searchable list of kawaii text faces
- Copies the selected face to the clipboard
- Supports searching by mood and keywords like `happy`, `hug`, `shy`, or `love`

## Main files

- `src/search-kawaii-faces.tsx`: command UI and copy action
- `src/faces.ts`: kawaii face library
- `package.json`: extension metadata and publish settings

## Notes

- Before publishing, confirm that the `author` field matches your Raycast username.
- Publish to the Raycast Store with `npm run publish`.
