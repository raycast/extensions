# Submitting NicheFund Business Ideas to the Raycast Store

This repository is the source for the public NicheFund Raycast extension.

## Before submission

1. Install Node.js 22.14 or newer and npm 7 or newer.
2. Install the current Raycast release and sign in to the Raycast account that owns `backlooplabs`.
3. Confirm the `author` in `package.json` is the exact Raycast username that will submit the extension (`backlooplabs` currently).
4. Confirm the `platforms` field lists every supported platform. This extension supports macOS and Windows.
5. Confirm `assets/extension-icon.png` is the final NicheFund 512×512 PNG icon and looks good in both themes.
6. Capture at least three Raycast Window Capture screenshots. Save them to `metadata/` as 2000×1250 PNGs, use one background and theme throughout, and select **Save to Metadata**:
   - Latest Teardowns list
   - A teardown detail view
   - Teardown of the Day with its actions
7. Update `CHANGELOG.md`, keeping `{PR_MERGE_DATE}` as the release date placeholder.

## Local validation

```bash
npm ci
npm run lint
npm run build -- -e dist
```

Open the distribution build in Raycast and test all three commands, pagination, category filtering, offline errors, and every browser/copy action.

## Publish

From this directory:

```bash
npm run publish
```

The Raycast CLI authenticates with GitHub and opens a pull request against `raycast/extensions`. Complete the PR description with the purpose, test steps, and screenshots. Raycast's CI validates the manifest, assets, lint, type checks, and production build. Address review comments by pushing commits and rerunning `npm run publish`.

After the PR is merged, the extension is published automatically. Use Raycast's **Manage Extensions** command and the copy-link action to obtain the Store URL.

## Manual alternative

Fork `https://github.com/raycast/extensions`, add this extension under the repository's extensions directory, push the branch, and open a pull request to `main`. Follow the repository's current contribution structure and validation checks.

## User installation

After publication, users install it from Raycast's **Store** command or the Store URL. During development, run `npm run dev`; Raycast imports the local extension and hot-reloads changes.
