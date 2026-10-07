# Publishing Tallies

The extension has not yet been submitted to the Raycast Store.

The manifest uses the verified Raycast profile handle `spannmicah`. The internal extension name is `tallies`; its public title is **Tallies**.

## Local validation

```sh
npm test
npm run build
npm run lint
```

The tests, TypeScript build, ESLint, formatting, and icon checks passed during preparation. Full lint and publishing could not finish because the agent environment could not resolve `www.raycast.com` to download the schema and validate the author. Run the commands above in your own terminal with internet access.

## Store screenshots

Store screenshots are included in `metadata/`:

- `tallies-1.png`: attendance roster with present, clocked-out, and no-show entries.
- `tallies-2.png`: template form with a default time, heading, notes, and reusable placeholders.

Both are native Raycast Window Capture exports at 2000 × 1250 pixels, using fictional names and notes with the same theme and background. When refreshing them, use fictional data, never an actual attendance roster. Raycast's Window Capture workflow can save replacements directly into `metadata/`.

See [Raycast's screenshot instructions](https://developers.raycast.com/basics/prepare-an-extension-for-store#screenshots).

## Submit

```sh
cd /Users/micah/dev/tallies
npm run publish
```

Follow Raycast's GitHub authentication prompts. This opens a pull request in `raycast/extensions`; it does not immediately make the extension available in the Store. Raycast reviews the submission and publishes it after acceptance and merge.

The existing GitHub CLI authentication reported an invalid token. If you use `gh`, refresh it with `gh auth login --hostname github.com`. Never paste a token into an issue or pull request.

See [Raycast's publishing workflow](https://developers.raycast.com/basics/publish-an-extension).

## Use on another Mac before Store approval

Run `npm run bundle`, then transfer the resulting `tallies.rayext` to the other Mac and open it with Raycast. Export a backup from **Check in → Actions → Export Backup**, transfer the JSON file, then use **Import Backup** in the other installation. Keep your existing installation until its data has been backed up and transferred.

## Upgrade from the previous extension name

Before loading Tallies, export a JSON backup from your existing attendance extension. After loading Tallies, import that backup. The renamed extension has a separate Raycast storage scope; older attendance backups remain supported.
