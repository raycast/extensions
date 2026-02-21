# Velja Raycast Extension

A [Raycast](https://www.raycast.com/) extension for controlling [Velja](https://sindresorhus.com/velja) — the macOS browser router by Sindre Sorhus.

> Velja lets you open links in a specific browser or matching native app, easily switch between browsers, and create powerful rules for URL routing.

## Features

### Browser Management

- **List Browsers** — View all installed browsers and profiles detected by Velja
- **Get/Set Default Browser** — View or change the primary browser
- **Get/Set Alternative Browser** — View or change the alternative browser (triggered with Fn key)

### Rules Management

- **List Rules** — View all routing rules with their status
- **Toggle Rules** — Enable or disable rules
- **Create Rules (AI Draft + Manual)** — Generate drafts from natural language or build rules manually
- **Delete Rules** — Remove rules you no longer need

### Raycast AI Extension

- Mention `@velja-raycast` in Quick AI / AI Chat / AI Commands
- AI can inspect existing rules (including domain-aware lookups) and create Velja rules
- Manual Create Rule form remains available for direct, in-command editing

### URL Actions

- **Open URL with Velja** — Open a URL respecting your Velja rules
- **Open URL in Browser** — Open a URL in a specific browser or profile
- **Remove Tracking Parameters** — Clean tracking parameters from URLs
- **Open URL from Clipboard** — Open the URL currently in your clipboard

## Prerequisites

- macOS 14+ (Sonoma or later)
- [Velja](https://sindresorhus.com/velja) installed and set as default browser
- [Raycast](https://www.raycast.com/) installed

## Development

```bash
# Clone the repo
git clone https://github.com/lmoloney/raycast-velja.git
cd raycast-velja

# Install dependencies
npm install

# Start development mode (hot-reload in Raycast)
npm run dev
```

## Identity profiles (run local + store concurrently)

This repo defaults to a **dev identity** so you can run it alongside a future Store version:

- `name`: `velja-dev`
- `title`: `Velja Dev`
- AI mention: `@velja-dev`

Switch profiles with:

```bash
npm run profile:status        # Show current profile
npm run profile:prod          # Switch to upstream/store identity
npm run profile:check-upstream
npm run profile:dev           # Switch back to local dev identity
```

Upstream PR prep should always use the production profile (`velja-raycast` / `Velja`) and pass `profile:check-upstream`.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed development setup and guidelines.
For release preparation, see [docs/release-checklist.md](docs/release-checklist.md).
For AI usage details, see [docs/ai-extension-usage.md](docs/ai-extension-usage.md).

## Architecture

This extension uses a hybrid integration approach:

- **macOS Shortcuts** for Velja actions (get/set browsers, open URLs)
- **Plist read/write** for configuration and rule management

See [docs/architecture.md](docs/architecture.md) for detailed architecture decisions and [docs/velja-integration.md](docs/velja-integration.md) for Velja's integration surface.

## Project Status

This project is under active development. See the [GitHub Issues](https://github.com/lmoloney/raycast-velja/issues) for the current roadmap.

| Phase   | Status | Description                         |
| ------- | ------ | ----------------------------------- |
| Phase 1 | 🔜     | Project setup & core infrastructure |
| Phase 2 | 📋     | Browser management commands         |
| Phase 3 | 📋     | Rules management                    |
| Phase 4 | 📋     | URL actions                         |
| Phase 5 | 📋     | Polish & advanced features          |

## License

MIT
