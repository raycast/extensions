# Remix Icon

![Remix Icon Extension](metadata/remix-icon-1.png)

A Raycast extension to search and browse [Remix Icon](https://remixicon.com/) library (v4.8.0) with icons across 19 categories.

## Features

- **Search & Browse**: Instantly search through icons by name
- **Category Filtering**: Filter icons by 19 categories (Arrows, Buildings, Business, Communication, Design, Development, Device, Document, Editor, Finance, Food, Health & Medical, Logos, Map, Media, Others, System, User & Faces, Weather)
- **Recent Icons**: Quick access to your last 8 used icons
- **Multiple Copy Formats**:
  - Copy as SVG (raw SVG code)
  - Copy as Webfont (`<i class="icon-name"></i>`)
  - Copy as Data URI (base64 encoded for inline use)
- **Quick Links**: Direct access to Remix Icon homepage and GitHub repository

## Installation

Install via the [Raycast Store](https://www.raycast.com/tristan_heinig/remix-icon) or build from source.

## Development

### Prerequisites

- Node.js 22.14+
- [Raycast](https://www.raycast.com/) installed on macOS

### Setup

```bash
# Install dependencies
npm install

# Start development mode
npm run dev

# Build for production
npm run build

# Lint code
npm run lint

# Fix linting issues
npm run fix-lint
```

### Updating Icons

To sync with the latest Remix Icon release from GitHub:

```bash
./scripts/update-icons.sh
```

The update script:

- **Version checking**: Automatically detects and downloads new releases
- **Official releases**: Downloads the `RemixIcon_Svg_*.zip` asset from GitHub releases
- **Smart updates**: Only updates when a new version is available (tracked in `scripts/.remix-version`)
- **Auto-rebuild**: Regenerates `catalogue.json` from downloaded icons

### Project Structure

```
src/
├── search.tsx              # Main command with Grid view and filtering
├── CategorySection.tsx     # Renders icon grid sections
├── IconActionPanel.tsx     # Action menu for copy operations
├── types.ts               # TypeScript interfaces
└── utils.tsx              # Helper functions

assets/
├── catalogue.json         # Icon metadata
└── icons/                 # SVG files organized by category

scripts/
├── update-icons.sh        # Downloads latest release and rebuilds catalogue
└── .remix-version         # Tracks currently installed version
```

## Future Enhancements

- React and Vue component export
- CDN link export
- SVG sprite export
- PNG export support
- Starred/favorite icons
- Settings for size, color, palette option and default export format

## License

MIT License - Extension code by [Tristan Heinig](https://github.com/tristan_heinig)

Icons by [Remix Design](https://github.com/Remix-Design/RemixIcon) (Apache License Version 2.0)
