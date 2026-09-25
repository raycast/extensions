# Local Amp Runners

Manage the folders served by local Amp runners without duplicating Amp's state.

## Features

- Choose an available local runner and list its served folders.
- Add a folder with `amp runner dirs add`.
- Remove a folder with `amp runner dirs remove` after confirmation.
- Open folders, reveal them in Finder, and copy their paths.
- Open Amp Runner Settings for configuration such as renaming the runner.

Runner names cannot currently be changed by the public Amp CLI. **Open Amp Runner Settings** opens Amp instead of modifying its private preferences.

## Requirements

- Install the [Amp CLI](https://ampcode.com/docs/cli) and sign in.
- Start a local runner with `amp --no-tui`, or enable **Use This Mac as a Runner** in the Amp macOS app.
- The extension uses `~/.local/bin/amp` by default. Change **Amp Executable** in the extension preferences if Amp is installed elsewhere.

The extension stores no runner or folder state. Every refresh reads `amp runner list --json`, and changes are sent directly to the Amp CLI.

## Development

```sh
npm install
npm test
npm run typecheck
npm run lint
npm run build
```
