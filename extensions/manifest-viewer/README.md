# Manifest Viewer

A Raycast extension for viewing and navigating HLS/DASH manifest files with keyboard navigation.

## Features

- **Load and view manifest files** from URLs (HLS master playlists, DASH MPD files)
- **Interactive navigation** to child manifests and variant playlists

## Usage

### Basic Usage

1. Open Raycast and search for "View Manifest"
2. Enter a manifest URL in the search field or provide it as an argument
3. Press Enter to load and view the manifest content

### Supported Formats

- **HLS** (HTTP Live Streaming) - `.m3u8` master and variant playlists
- **DASH** (Dynamic Adaptive Streaming over HTTP) - `.mpd` files

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) (v16 or later)
- [Raycast](https://raycast.com/) installed

### Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development mode:
   ```bash
   npm run dev
   ```

### Development Commands

- `npm run dev` - Start development mode with hot reload
- `npm run build` - Build the extension
- `npm run lint` - Run ESLint
- `npm run fix-lint` - Fix linting issues automatically

## Publishing

Follow [Raycast](https://developers.raycast.com/basics/publish-an-extension) documentation to publish

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed list of changes in each version.

## License

MIT License - see [LICENSE](LICENSE) file for details.
