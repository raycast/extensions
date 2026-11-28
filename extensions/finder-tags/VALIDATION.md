# Validation

Run these checks on macOS with Node.js, Raycast, and the Swift 6 toolchain installed:

```sh
npm ci
npm run build
npm run typecheck
npm run lint
npm test
npm run test:native
npx ray evals -I --exit-on-error -s
```

Build before typechecking so Raycast generates its environment and Swift bridge declarations. The native tests operate on temporary fixtures, including tag colour preservation, legacy Finder labels, replaced files, and locked files. AI evals use mocked tool results and do not establish that a live AI workflow succeeded.

## Manual release checks

Use disposable files and folders with known Finder tags, including coloured and uncoloured tags. Test the distribution build in Raycast and record the revision, macOS version, scenario, and observed result.

- Select several files in Finder. Apply an existing tag, create a new tag, remove a partial tag, and cancel Remove All Tags. Check the result in Finder and preserve unrelated tags and colours.
- Disable Close Raycast after tagging. Write a tag, change it in Finder, filter the list to an empty result, and use Refresh Tags. Clear the search and check that the current Finder tags appear.
- Run Quick Tag with several names and with a leading minus. Verify failures identify unavailable files while valid files continue.
- Search by one tag and by Match All / Match Any. Check file kinds and both date boundaries. Rename and remove a tag across the configured scope only after reviewing the confirmation.
- Change the Finder selection while an AI write confirmation is open. Confirm that only the previewed paths are considered. Replace a previewed file with a different file at the same path before approval; confirm it is skipped. Cancel a confirmation, let another expire, and confirm neither can perform an unapproved write.
- Hold a file lock in another process. Verify reads and writes report that file promptly and continue processing other files.
- Check recovery messages with no Finder selection, denied Automation permission, protected folders, unavailable Spotlight indexing, symbolic links, and an inaccessible file. Use disposable network/FAT/exFAT fixtures when available to verify the documented write restrictions.
- Verify the Finder palette fallback warning, custom names, and colours. Separately check iCloud syncing and supported macOS versions; local unit tests do not verify cross-device behaviour.
- Capture the required Store screenshots from the tested build and complete the submission checklist.

These are release checks to perform and record, not a claim that every scenario has already been tested.
