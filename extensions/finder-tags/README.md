# Finder Tags

Apply Finder tags, browse your tags, and find tagged files from Raycast. No account or external command-line tagging utility is required.

## Commands

| Command             | Use                                                                                                                        |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Tag Selected Files  | Select files in Finder, open the command, and press Enter on a tag to apply or remove it. Type a new name to create a tag. |
| Quick Tag           | Apply a tag without opening a list. Use `invoice-2026,review` to add several, or `-draft,review` to remove both.           |
| Search Tags         | Browse tags with colours and file counts. Open a tag to see its files.                                                     |
| Search Files by Tag | Filter tagged files by name, inspect metadata, use Quick Look, open files, or change tags.                                 |

In **Tag Selected Files**, a checkmark means every selected file has the tag. A partial indicator shows how many files have it. Pressing Enter on a partial tag adds it to the remaining files. Remove All Tags asks for confirmation; Copy Tags copies each file's tag list.

In **Search Files by Tag**, choose **Match All of…** to pick several tags. The form lets you require every selected tag or match any of them. Open, Show in Finder, Quick Look, Copy Path, and tag actions are available from the action panel.

**Rename Tag Everywhere** and **Remove Tag Everywhere** operate on indexed, readable files in your configured search folders. They show a current file count before writing, preserve unrelated tags, and report failures. They do not change Finder's saved palette or sidebar entries. A renamed tag merges into an existing destination tag when one exists.

## Preferences

| Preference                  | Default                                                                      |
| --------------------------- | ---------------------------------------------------------------------------- |
| Search Scope                | `~`, your home folder                                                        |
| Extra Folders               | None. Separate additional absolute folder paths with semicolons or newlines. |
| Close Raycast after tagging | On, for Tag Selected Files. Quick Tag always shows a HUD.                    |
| Sort tags by file count     | On. Disable to sort alphabetically.                                          |

Overlapping search folders are deduplicated. Counts reflect readable, indexed files in these folders. Saved Finder tags remain available when Spotlight is off. Incomplete searches show “Count unavailable” or a lower bound such as “2+ files” instead of a misleading zero.

Quick Tag treats commas as separators and one leading minus as removal for the whole argument. Use Tag Selected Files or AI tools for a literal tag containing a comma or beginning with a minus.

## Raycast AI

Four tools are available: `list-tags`, `find-files-by-tag`, `tag-files`, and `untag-files`.

- `@finder-tags tag these as invoice-2026`
- `@finder-tags which PDFs are tagged tax-2025?`
- `@finder-tags move the draft tag off everything in the selection`
- `@finder-tags tag everything tagged receipts modified in March 2026 as invoice-2026`
- `@finder-tags what tags do I use most?`

Write tools show the exact paths and tags before making changes. Omitted or empty paths use the Finder selection at confirmation time. The confirmed file list stays fixed even if the selection changes. A preview expires after two minutes and can be used once; after cancelling, an identical request may need to wait for that expiry. Replaced or missing files are skipped.

Search returns up to 50 files and reports `hasMore` when candidates remain. Narrow the query before asking AI to change every match. `list-tags` returns `countsArePartial` when counts are only lower bounds. Date filters use inclusive `modifiedAfter` and exclusive `modifiedBefore` bounds. File kind accepts `pdf`, `image`, `audio`, `video`, `folder`, `document`, `text`, or a file extension.

The extension's file operations run locally and make no network requests. Raycast AI processes prompts and tool results through Raycast's AI service, including paths and tag metadata supplied to those tools.

## Permissions and limitations

- Allow Raycast to control Finder under **System Settings → Privacy & Security → Automation**. Empty and denied selections include recovery actions.
- macOS may also request access to protected folders such as Documents, Desktop, Downloads, and iCloud Drive. Unreadable or unwritable files are reported individually.
- Spotlight must index your search folders. Search views show a warning when indexing is off or its status cannot be verified. Direct tagging still works without Spotlight.
- Native write results update the current view immediately. Recently written paths are remembered locally for two minutes and reread on subsequent searches while Spotlight catches up.
- Saved tags and their colours come from Finder's local shared list, including tags hidden from the sidebar. If that private catalogue is unavailable, the extension tries the older synced palette, then Finder favourites and tags found on files. A warning identifies an incomplete catalogue.
- Network volumes, FAT/exFAT writes, and symbolic-link writes are skipped with per-file errors. Select the original file instead of a symbolic link.
- The extension preserves existing tag colour suffixes and keeps Finder's legacy colour label in sync. Set colours in Finder. New tags use a known Finder palette colour when available, otherwise no colour. Renaming to a new tag preserves its source colour.
- iCloud syncing is handled by macOS. Cross-device tag sync and separate macOS 15/26 compatibility checks still need manual verification.

## Development

Requires macOS, Node.js, Raycast, and Xcode with the Swift 6 toolchain. The native helper uses [Raycast's Swift tools](https://github.com/raycast/extensions-swift-tools), following the same approach as [Color Picker](https://github.com/raycast/extensions/tree/main/extensions/color-picker).

Swift source lives in `swift/finder-tags` and exports functions with `@raycast`. TypeScript calls these through the `swift:../../swift/finder-tags` import in `src/lib/native.ts`. Raycast compiles the helper automatically during `npm run build` and `npm run dev`. The generated executable in `assets/compiled_raycast_swift` and Swift build folders are ignored by Git; no prebuilt helper binary needs to be committed.

```sh
npm install
npm run dev
```

Validation commands:

```sh
npm run build
npm run typecheck
npm run lint
npm test
npm run test:native
npx ray evals -I --exit-on-error -s
```

The native test creates 100 temporary files, verifies tags through Apple's resource API, checks byte-preserving colour handling, and removes its fixtures afterward. AI evals use mocked tool results, so they do not modify real files.

See [VALIDATION.md](VALIDATION.md) for the spike findings and manual release checks. Store screenshots and submission are separate release steps.
