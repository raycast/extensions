---
description: The Raycast CLI allows you to build, develop, and lint your extension.
---

# CLI

The CLI is part of the `@raycast/api` package and is automatically installed in your extension directory during setup. To get a list of the available CLI commands, run the following command inside your extension directory:

```bash
 npx ray help
```

## Build

`npx ray build` creates an optimized production build of your extension for distribution. This command is used by our CI to publish your extension to the store.

You can use `npx ray build -e dist` to validate that your extension builds properly.

## Bundle

`npx ray bundle` creates a `.rayext` zip archive containing the optimized extension build. The archive contains `package.json` and all built files at its root and defaults to `<extension-name>.rayext` in the current directory. Use `--output` or `-o` to choose another path.

## Development

`npx ray develop` starts your extension in development mode. The mode includes the following:

- Extension shows up at the top of the root search for quick access
- Commands get automatically reloaded when you save your changes (you can toggle auto-reloading in Raycast Settings > Extensions > Developer > "Auto-reload on save").
- Error overlays include detailed stack traces for faster debugging
- Log messages are displayed in the terminal
- The command icon in the bottom-left shows when the extension is rebuilding or failed to build. Build errors include actions to open the source location in your editor or copy the diagnostic, while the last successful command keeps running.
- Imports the extension to Raycast if it wasn't before

## Lint

`npx ray lint` runs [ESLint](http://eslint.org) for all files in the `src` directory.

## Migrate

`npx ray migrate` [migrates](../../migration/README.md) your extension to the latest version of the `@raycast/api`.

## Publish

`npx ray publish` verifies, builds, and publishes an extension.

If the extension is private (eg. has an `owner` and no public `access`), it will be published to the organization's private store. This command is only available to users that are part of that organization. Learn more about it [here](../../teams/getting-started.md).
