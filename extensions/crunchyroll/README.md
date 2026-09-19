# Crunchyroll for Raycast

Search anime, browse trending and history, and open Crunchyroll in a Safari web app with auto Picture-in-Picture — all from Raycast.

## Features

- **Search Anime** — Live search across Crunchyroll's catalog with poster art, episode counts, and premium badges
- **Continue Watching** — Instantly opens the Crunchyroll Safari web app and resumes your last watched episode
- **Browse Trending** — Discover popular anime, cached for instant load with background refresh
- **Browse History** — Quick access to your recently watched anime, cached and searchable
- **Setup Crunchyroll** — One-time setup guide for the Safari web app and AutoPiP extension

## Requirements

- [Raycast](https://raycast.com)
- macOS 13+
- Safari (for web app integration)

## Install

### From the Raycast Store (recommended)

Once published, search "Crunchyroll" in the Raycast Store and click Install.

### From Source

```bash
git clone https://github.com/abhishakenp/crunchyroll-raycast.git
cd crunchyroll-raycast
npm install
npm run build
ray publish
```

The `ray publish` command will install the extension locally and submit it to the Raycast Store.

## First-Time Setup

1. Open the **Setup Crunchyroll** command in Raycast
2. Follow the guide to create a Safari web app for Crunchyroll (Safari → File → Add to Dock)
3. (Optional) Install [AutoPiP](https://apps.apple.com/app/autopip) Safari extension for automatic Picture-in-Picture
4. You're ready — search anime and hit Enter to open in the web app

## How It Works

- Uses Crunchyroll's anonymous guest API (no account or API key needed)
- Search results, trending, and history are cached with `@tanstack/react-query` + Raycast `LocalStorage` for instant load
- Opening anime launches the Safari web app and navigates to the series page
- **Continue Watching** resumes the last page the web app was on (it remembers its state)

## Tech Stack

- [Raycast API](https://developers.raycast.com)
- React 19 + TypeScript
- [@tanstack/react-query](https://tanstack.com/query) for data fetching and caching
- AppleScript for Safari web app control

## License

MIT
