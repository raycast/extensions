# Contribuing to Raycast PM2

Raycast PM2 welcomes contributions and corrections. Before contributing, please make sure you have read the guidelines below.
If you decide to contribute anything, please follow the steps below.

## Get source code

See [Contribute to an Extension](https://developers.raycast.com/basics/contribute-to-an-extension) or fork it on GitHub directly (this might take a while).

## Folder structure

The `assets/fake-vendor` folder is used for mocking unused dependencies from `pm2`. Currently, unused dependencies are:

- `pty.js`
- `term.js`

We also omitted `fsevents` from `package-lock.json` due to it has issue while compiling.

## Development

If you have modified `example.mjs` or `fake-vendor`, you will need to stop and restart the dev server (`npm run dev`) to apply the new changes.

Please note that when you run Node.js in Raycast's box, the environment variables and PATH information you get are not the same as when running directly in your Terminal.
