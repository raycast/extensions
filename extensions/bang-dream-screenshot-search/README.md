# BanG Dream! Screenshot Search

**English** | [繁體中文](README.zh-TW.md)

A Raycast extension for finding and copying Traditional Chinese dialogue screenshots from BanG Dream! anime series.

The initial release includes **MyGO!!!!!** and **Ave Mujica**. Browse remote previews, search dialogue, and copy the selected JPG to the macOS clipboard without leaving Raycast.

## Features

- Search Traditional Chinese dialogue across all included series.
- Filter by series, favorites, or recently used screenshots.
- Switch instantly between all screenshots, favorites, and recently used with `Command-1`, `Command-2`, and `Command-3`.
- Browse the full catalog in paginated batches.
- Press `Enter` to download the source JPG to one temporary file and copy it to the macOS clipboard.
- Keep favorite IDs and the 30 most recently copied IDs in Raycast LocalStorage.

## Privacy and Local Data

- The extension does not include analytics or usage tracking.
- Search text is kept only in the active Raycast view and is not persisted.
- Raycast LocalStorage contains only screenshot IDs under `favorites.v1` and `recent.v1`.
- The bundled catalog contains metadata and commit-pinned remote URLs, not image bytes.
- WebP previews and selected JPG files are requested directly from the upstream GitHub repository.
- The extension does not provide an offline image cache. Raycast, macOS, and network intermediaries may maintain their own caches.

The selected clipboard image uses a content-addressed temporary path:

```text
/tmp/bang-dream-screenshot-search/clipboard-<content-hash>.jpg
```

Changing the path with the image content prevents apps such as LINE from reusing a stale file-path cache. After a successful copy, older clipboard images are removed, so the directory retains only the current JPG.

## Source and Attribution

Screenshot metadata and remote image URLs are generated from the public [Ave Mujica Screenshot Search repository](https://github.com/serser322/ave-mujica-images), which powers [ave-mujica-images.pages.dev](https://ave-mujica-images.pages.dev/).

See [NOTICE.md](NOTICE.md) for the complete source and rights disclosure. This extension is unofficial and is not endorsed by or affiliated with the BanG Dream! rights holders or the upstream project. The MIT license covers this extension's source code only; it does not grant rights to the names, logos, characters, animation footage, or screenshots.

## Development

Requirements:

- macOS with Raycast installed
- Node.js 22.22.2 through `nvm`

```bash
nvm use
npm install
npm run dev
```

Validation commands:

```bash
npm test
npm run lint
npm run build
```
