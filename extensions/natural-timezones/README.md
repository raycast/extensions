# Natural Timezones

Raycast extension for the Time natural-language timezone parser.

## Requirements

- Raycast 1.26.0 or newer
- Node.js 22.14 or newer
- npm 7 or newer
- A signed-in Raycast account for development commands

## Development

```sh
npm install
npm run dev
```

The generated timezone dictionary is committed so Raycast Store CI does not need the web app repository.
`npm run dev` installs the command into Raycast in development mode with hot reload.

For local non-store use, run `npm install && npm run dev`, then open `Search Natural Timezones` from Raycast root search.

## Verification

```sh
npm run build
npm run lint
npm run smoke
```

`npm run smoke` checks every bundled example query against the extracted parser.

## Updating Timezone Data

If this repo sits next to the Time web app checkout at `../time`, run:

```sh
npm run update-data
```

For another checkout path:

```sh
TIME_APP_ROOT=/path/to/time npm run update-data
```

## Store Publishing

Before publishing:

- Confirm `author` is your Raycast Store handle.
- Keep `license` as `MIT`.
- Keep `package-lock.json` committed.
- Keep the 512px PNG icon in `assets/icon.png`.
- Add store screenshots through Raycast Window Capture if you want a richer store listing.
- Run `npm run build`, `npm run lint`, and `npm run smoke`.

Publish:

```sh
npm run publish
```

Raycast will authenticate with GitHub and open a pull request to `raycast/extensions`. After review and merge, the extension is published to the Raycast Store.
