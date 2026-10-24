# Spacetile for Raycast

Drive [Spacetile](https://spacetile.app) from Raycast. Every command in Spacetile's Settings → Keys is a Raycast command, so you can give it an alias or a hotkey in Raycast, alongside or instead of Spacetile's own shortcuts. **Run Command** sends any other command from the [command list](https://spacetile.app/docs/commands/), such as `load Work`.

The MIT licence covers this extension only. Spacetile itself has its own licence.

The Raycast Store builds extensions with npm, so this directory uses npm and commits `package-lock.json`.

```sh
npm install
npm run dev        # loads the extension into Raycast
npm run lint
```

## Generated commands

The commands come from the app's catalogue (`KeyAction.sections` in `app/Sources/SpacetileCore/KeyCatalog.swift`), so Raycast offers exactly what Settings → Keys lists. After changing it:

```sh
npm run generate
```

This runs the app's `spacetile-catalog` tool, which writes `catalog.json` and draws `assets/regions/*.png` for the placement commands, then `scripts/generate.mts`, which writes one `src/<name>.ts` per command and the matching `commands` in `package.json`. Commit the results. Hand-written commands (`run-command`) are listed in the script and left alone.

## Publishing

This directory is the extension's source. The Raycast Store's copy in `raycast/extensions` follows it, so first pull in any edits made there:

```sh
npx ray pull-contributions
```

Then run the smoke checklist below with `npm run dev`, against the installed public release of Spacetile, and publish with `npm run publish`. Publishing opens a pull request in `raycast/extensions`.

### Smoke checklist

- [ ] One command from each section of Settings → Keys acts on the window behind Raycast
- [ ] A placement command shows its region icon in Raycast and moves the window
- [ ] **Run Command** with `focus west` shows the `Spacetile: focus west` HUD and moves focus
- [ ] **Run Command** with an unknown command does nothing and doesn't crash
- [ ] With Spacetile quit, a command starts Spacetile, shows "Starting Spacetile. Run the command again once it's ready." and doesn't run
- [ ] With Spacetile not installed, a command shows "Spacetile isn't installed", and **Get Spacetile** opens spacetile.app
