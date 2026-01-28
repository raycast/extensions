# Contribuing to Raycast PM2

Raycast PM2 welcomes contributions and corrections. Before contributing, please make sure you have read the guidelines below.
If you decide to contribute anything, please follow the steps below.

## Get source code

See [Contribute to an Extension](https://developers.raycast.com/basics/contribute-to-an-extension) or fork it on GitHub directly (this might take a while).

## Folder structure

The `pm2-wrapper` is placed under the `assets` folder. It's a standalone Node.js application. You don't need to run `npm install` unless you need to modify the package related information.

Please make sure there is no `node_modules` under the `pm2-wrapper` folder. The Raycast will build all assets to `~/.config/raycast/pm2/assets`. You should verify the `node_modules` isntallation behavior there.

## Development

If you have modified `pm2-wrapper`, you will need to stop and restart the dev server (`npm run dev`) to apply the new changes.

Please note that when you run Node.js in Raycast's box, the environment variables and PATH information you get are not the same as when running directly in your Terminal.
