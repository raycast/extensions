# Raycast Melange

Private Raycast utilities. The current command searches Anna's Archive for English EPUB results, ranks likely good matches, opens the official slow-download page by default, and can use Anna's member fast-download API when a secret key is configured in Raycast preferences.

## Commands

### Search EPUBs

- Searches `annas-archive.gl` with failover to `annas-archive.pk` and `annas-archive.gd`.
- Requests EPUB and English results only.
- Highlights the top-ranked result and shows its cover when the search page exposes one.
- Opens the slow-download page as the default action.
- Provides actions to open the source result page, copy MD5/URLs, copy a clean filename, and download via the official fast-download API.

## Preferences

- `Anna's Archive Secret Key`: optional. Used only for `/dyn/api/fast_download.json`.
- `Download Directory`: optional. Defaults to `~/Downloads/Annas Archive`.

The extension does not store the secret key outside Raycast preferences.

## Local Development

```sh
bun install
bun run dev
```

Build and lint:

```sh
bun run build
bun run lint
```

Raycast's Store CI uses npm, so this repo also includes `package-lock.json`:

```sh
npm run build
npm run lint
```

## Publishing

This extension should stay local/private unless you have confirmed the third-party service terms and Raycast review expectations. It intentionally does not automate slow-download timers, browser verification, waitlists, third-party mirrors, or page-click scraping.

For a private Raycast Team extension:

1. Find your organization handle in Raycast with `Manage Organization` and `Copy Organization Handle`.
2. Add this to `package.json` before publishing:

```json
{
  "owner": "your-org-handle"
}
```

3. Run:

```sh
npm run publish
```

For a public Store submission, also capture real Raycast screenshots with Window Capture and save them to extension metadata, then run `npm run publish`. Do not publish screenshots containing private search terms, secret keys, or downloads.

## Mobile

Raycast iOS does not run custom extension commands. The practical mobile substitute is a synced Quicklink such as:

```text
https://annas-archive.gl/search?q={Query}&ext=epub&lang=en
```

That can search Anna's Archive from iOS, but it will not run this TypeScript extension or its download action.
