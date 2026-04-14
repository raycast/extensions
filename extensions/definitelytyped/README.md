# DefinitelyTyped

Raycast extension to search `@types` packages from [DefinitelyTyped](https://github.com/DefinitelyTyped/DefinitelyTyped) — the repository for high quality TypeScript type definitions.

> **Note:** This project is a personal project and is not affiliated with DefinitelyTyped.

## How It Works

Searches are performed live against the [npm registry](https://www.npmjs.com/) — type at least 2 characters to find matching `@types` packages. Results are returned directly from npm, so no local data is stored.

### Available Commands

### macOS

- `⌘ ⇧ C`: Copy install command (`npm install -D @types/...`)
- `⌘ ⇧ F`: Add or remove package from favorites
- `⌘ x`: Open package on [npmx.dev](https://npmx.dev)
- `⌘ n`: Open package on [npmjs.com](https://www.npmjs.com/)
- `⌘ g`: Open source on GitHub

### Windows

- `Ctrl + shift + C`: Copy install command (`npm install -D @types/...`)
- `Ctrl + Shift + F`: Add or remove package from favorites
- `Ctrl + x`: Open package on [npmx.dev](https://npmx.dev)
- `Ctrl + n`: Open package on [npmjs.com](https://www.npmjs.com/)
- `Ctrl + g`: Open source on GitHub

## Getting Started

### Prerequisites

- [Raycast](https://www.raycast.com/)

### Installation

1. Open Raycast and search for "Extensions"
2. Search for "DefinitelyTyped" and click on "Install"
3. Run the `Search @Types Packages` command and start typing to find packages

## Development

### Prerequisites

- [Node.js](https://nodejs.org/)
- [Raycast](https://www.raycast.com/)

### Running locally

```bash
npm install
npm run dev
```

This will start the extension in development mode with hot-reload via Raycast.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
