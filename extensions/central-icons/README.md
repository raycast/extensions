# Central Icons

Browse, search and export the [Central Icon System](https://iconists.co/central) without leaving Raycast — 2,000+ icons, each available in 30 style variants.

## Features

- **Browse by category**, ordered exactly like [centralicons.com](https://centralicons.com), with a **New** section grouping recently added icons by month.
- **Style controls in the search bar** — fill (outlined/filled), stroke width (1/1.5/2), corner radius (0–3), line join (round/square), icon size, and raw vs. masked output.
- **Search** across icon names and aliases, with AI-assisted suggestions when nothing matches exactly.
- **Copy or paste** SVG, icon name, data URI, or a React, React Native, Vue, or Solid snippet.
- **Export** a single icon as an SVG file, or a whole style set at once, to your Downloads folder.
- **Always current** — icons are downloaded from npm on first launch and refresh automatically when a new release ships, so you don't wait on an extension update.

## Commands

| Command      | Description                       |
| ------------ | --------------------------------- |
| Search Icons | Browse, search, and export icons. |

## Free and Licensed Use

The extension is free to install and browse. Copying and exporting is limited to **10 free copies**, after which a Central Icon System license is required.

The icons themselves are a commercial set — installing this extension does not grant you a license to use them. To unlock unlimited copies and the **Export All Icons** action:

1. Buy a license at [iconists.co/central](https://iconists.co/central).
2. Open the command preferences (`⌘` `⇧` `,` on the Search Icons command).
3. Paste your key into **License Key**, then reopen the command — Raycast hands a command its preferences when it launches, so a new key takes effect the next time you open it.

The key is stored with Raycast's `password` preference type, so it lives in Raycast's encrypted local store — never in plain text and never in this repository.

## Privacy

Three requests leave your Mac, all to first-party endpoints. There is no third-party analytics, and no crash or event reporting.

| When                                      | Where                              | What is sent                                                                                                                                                  |
| ----------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| On launch, and at most once per 24 hours  | `centralicons.com/license/check`   | Your license key, plus `package: "raycast"` and the extension version, so the license seat can be validated and counted. Only sent if you have entered a key. |
| On launch, when a new icon release exists | `registry.npmjs.org`               | Nothing — a public package manifest and tarball are downloaded.                                                                                               |
| While typing a search of 3+ characters    | `centralicons.com/search/semantic` | Your search query only, to return AI-assisted suggestions. No license key, no identifier, and no local data.                                                  |

Icon names, exported files, and clipboard contents are never transmitted. Everything else — the icon set, your style settings, and your copy count — stays on disk in the extension's support directory and Raycast's local storage.

## How Icons Are Installed

Icons are not bundled with this extension. On first launch it reads the latest version of [`@central-icons-react/all`](https://www.npmjs.com/search?q=%40central-icons-react) from the public npm registry, downloads the tarball, and extracts two files (`icons/index.js` and `icons-index.json`) with the system `/usr/bin/tar` into the extension's support directory. A short-lived Node child process then splits them into per-variant caches, so the ~52 MB source is never parsed inside Raycast's worker.

This keeps the extension small, works offline after the first run, and means new icons arrive minutes after they are published rather than waiting on a store release.

## Credits

Central Icon System is designed and maintained by [Iconists](https://iconists.co). This extension is not affiliated with Raycast.
