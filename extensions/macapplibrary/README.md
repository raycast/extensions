# MacAppLibrary for Raycast

Search, organize, and manage your installed Mac apps from Raycast — powered by [macAppLibrary](https://coefficiencies.com/apps/macapplibrary/).

## Prerequisites

This extension requires the **macAppLibrary** desktop app to be installed and running. It connects to the app's local HTTP API, which is auto-discovered via `~/Library/Application Support/macAppLibrary/api.json`. If the app isn't running, the extension will prompt you to launch it.

Some features have additional requirements:

- **Generate AI Description** — requires an Anthropic API key configured in macAppLibrary Settings.
- **Submit to Community** — requires GitHub authentication configured in macAppLibrary Settings (it opens a PR on the macAppLibrary community repository).

## Commands

### Search Apps

Browse and search every app in your library by name, developer, bundle ID, or category. Each result shows the app's icon, developer, version, categories, running state, and favorite status.

Available actions:

- **Open App** — launches the app
- **Reveal in Finder** (`⌘R`)
- **Quit App** (`⌘⇧Q`) — only shown for running apps
- **Edit Metadata** (`⌘E`) — override description, developer, categories, website, notes, and favorite state
- **Pull Community Data** (`⌘P`) — fetch community-contributed metadata
- **Submit to Community** (`⌘⇧S`) — opens a PR with your local metadata
- **Generate AI Description** (`⌘G`) — uses Claude to write a description from app metadata
- **Copy Bundle ID**, **Open Website**, **Reload** (`⌘L`)

### Browse Categories

View your library grouped by category. Drill into any category to see the apps it contains, with the same per-app actions as Search Apps.

## Troubleshooting

- **"macAppLibrary is not running"** — Open the macAppLibrary app and click Retry.
- **"Unauthorized — token rejected"** — The discovery token is stale. Quit and relaunch macAppLibrary, then retry.
- **AI description fails** — Confirm an Anthropic API key is set in macAppLibrary Settings.
- **Submit to Community fails** — Confirm GitHub auth is set in macAppLibrary Settings.

## Development

```sh
npm install
npm run dev
```

The dev server hot-reloads on save. Run `npm run lint` (or `npm run fix-lint`) before publishing.
