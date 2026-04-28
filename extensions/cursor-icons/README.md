# Cursor Icons

Search, copy, and paste Cursor product icons from Raycast.

## Features

- Browse the Cursor icon set in a native Raycast Grid.
- Search by icon name, display name, style, concept, and tags.
- Filter by all icons, concepts, outline icons, or filled icons.
- Copy or paste the icon glyph, copy or paste the icon name, and copy the SVG source.
- Pin favorite icons and quickly reuse recently copied or pasted icons.

## Development

Install dependencies and start Raycast development mode:

```bash
npm install
npm run dev
```

The bundled catalog is generated from a local Cursor icon source checkout. By default, the generator looks for:

```text
../cursor-icons/source/icons/new
```

Override the source path when needed:

```bash
CURSOR_ICONS_PATH=/path/to/cursor-icons/source/icons/new npm run generate
```

Validate the extension before shipping:

```bash
npm test
npm run lint
npm run build
```