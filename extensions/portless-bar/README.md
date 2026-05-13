# Portless for Raycast

Search and manage active [Portless](https://portless.sh) routes from Raycast.

Portless gives local dev servers stable `.localhost` URLs. This extension reads the active Portless route store and makes those routes easy to find, open, copy, and stop from Raycast.

## Commands

- `Search Portless`: searchable list of active routes, formatted like `myapp web 4242`.
- `Menu Bar Portless`: menu-bar count with quick access to active routes.

## Actions

- Open route URL
- Copy route, URL, hostname, or full details
- Kill a process-backed route
- Refresh routes

## Development

```sh
npm install
npm run dev
```

Validation:

```sh
npm run lint
npm run build
```

## Notes

- The extension reads Portless state through the `portless` package. It does not shell out to a global `portless` binary.
- This repo uses npm and includes `package-lock.json` for Raycast Store submission compatibility.
