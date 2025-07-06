# Bible Search Tool for Raycast

A fast, local-first Raycast extension to search for verses and footnotes in the Recovery Version of the Bible (requires local SQLite database).

## Features

- **Instant Search:** Quickly find Bible verses and footnotes by reference or keyword.
- **Flexible Output:** Show verse numbers, references, and one verse per line (configurable).
- **Local Database:** Uses SQLite for fast, offline access.
- **Raycast Integration:** Designed for a seamless experience in the Raycast command bar.

## Usage

1. Open Raycast and type "Search Bible".
2. Enter a verse reference (e.g. `John 3:16`) or keywords (e.g. `love world`).
3. Configure preferences (verse numbers, references, one verse per line) in the Raycast extension preferences.

## Preferences

- **Press Enter to Search:** Only search when pressing Enter (reduces network/database calls).
- **Include Verse Numbers:** Show verse numbers in results.
- **Include References:** Show passage references in results.
- **Show One Verse Per Line:** Display each verse on a separate line.

## Development

### Prerequisites

- [Raycast](https://raycast.com/) (with developer mode enabled)
- [Node.js](https://nodejs.org/) (v18+ recommended)
- [npm](https://www.npmjs.com/)
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) (native dependency)

### Setup

```sh
npm install
```

Running Locally

```sh
npm run dev
```

This will open Raycast in development mode with your extension loaded.

### Troubleshooting

#### Fix node version mismatch (for better-sqlite3):

If better-sqlite3 does not work, it may need to be rebuilt:

1. Log the Node version used by Raycast (refer to the Raycast developer documentation).
2. Set the Electron version in your `package-lock.json` to match the Node version used by Raycast (see Electron release notes for version mapping).
3. Run:

```sh
rm -rf node_modules
npm install
npm install better-sqlite3 --update-binaries
```

4. If issues persist, try:

```sh
npm rebuild
npm i --save-dev @types/better-sqlite3
```
