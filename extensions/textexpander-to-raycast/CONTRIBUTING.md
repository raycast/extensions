# Development and release

## Validate

Use macOS and Node.js 22.22.2 or later.

```sh
npm ci
npm run check
```

`check` runs the conversion tests, TypeScript, Raycast manifest and icon validation, ESLint, formatting checks, and a distribution build. The plist integration tests use macOS `/usr/bin/plutil`.

## Check in Raycast

1. Run `npm run dev`, then open **Convert TextExpander Snippets**.
2. Choose **Choose a File or Settings Bundle** and select `examples/Email.csv`.
3. Preview the three snippets. Check multiline content and the warning on **Date template**.
4. Exclude **Date template** with Return. Search for a nonexistent name and confirm the empty state explains how to change the search. Clear the search. The two selected snippets should stay selected.
5. Press **⌘⇧E** and save to a temporary folder. Check the exported JSON against `examples/converted-example.json`.
6. Return to the export form and save the same filename. Confirm that it reports the existing file and preserves its contents.
7. Run Raycast's **Import Snippets**, select the exported file, and check the import preview. Complete the import only in a test library where adding the example snippets is appropriate.
8. Open an invalid source file and confirm the form explains the error. Also check a valid empty CSV and a settings bundle.

## Store screenshots

Use only the bundled example data in screenshots. Capture the source form, the preview with **Date template** selected to show its warning, and the completed export screen.

Use Raycast's **Capture Window** command with **Save to Metadata** enabled. Save up to six PNG screenshots in `metadata/`, at 2000 × 1250 pixels. Use the same background and theme for each capture. Raycast recommends at least three screenshots. See the [Store preparation guide](https://developers.raycast.com/basics/prepare-an-extension-for-store#screenshots).

## Submit

- Confirm that `0xdhrv` in `package.json` is the publishing Raycast account username.
- Include `package-lock.json`, the screenshots in `metadata/`, and the initial changelog entry. Keep the literal `{PR_MERGE_DATE}` placeholder.
- Run `npm run check` and review `npm audit` before submission. The current upstream CLI and lint dependency chains report moderate `minimatch` advisories with no compatible automated fix. Do not force a major transitive override without validating those tools.
- Run `npm run publish` when ready to open the Raycast Store submission. This command publishes through Raycast's contribution workflow and is separate from local validation.

The [publishing guide](https://developers.raycast.com/basics/publish-an-extension) describes the Store review process.
