# Development and release

## Validate

Use macOS and Node.js 22.22.2 or later.

```sh
npm ci
npm run check
```

`check` runs the conversion and migration tests, TypeScript, Raycast manifest and icon validation, ESLint, formatting checks, and a distribution build.

## Store screenshots

Use only the bundled example data in screenshots. Capture the source form, the preview with **Date template** selected to show its warning, and the completed export screen.

Use Raycast's **Capture Window** command with **Save to Metadata** enabled. Save up to six PNG screenshots in `metadata/`, at 2000 × 1250 pixels. Use the same background and theme for each capture. Raycast recommends at least three screenshots. See the [Store preparation guide](https://developers.raycast.com/basics/prepare-an-extension-for-store#screenshots).

## Submit

- Confirm that `0xdhrv` in `package.json` is the publishing Raycast account username.
- Include `package-lock.json`, the screenshots in `metadata/`, and the initial changelog entry. Keep the literal `{PR_MERGE_DATE}` placeholder.
- Run `npm run check` and review `npm audit` before submission. The current upstream CLI and lint dependency chains report moderate `minimatch` advisories with no compatible automated fix. Do not force a major transitive override without validating those tools.
- Run `npm run publish` when ready to open the Raycast Store submission. This command publishes through Raycast's contribution workflow and is separate from local validation.

The [publishing guide](https://developers.raycast.com/basics/publish-an-extension) describes the Store review process.
