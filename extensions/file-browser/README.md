# File Browser

[![Voyager Banner](assets/raycast-built-by-voyager-banner.png)](https://voyager.fm/?ref=raycast)

---

Browse, search, inspect, and manage your Mac's files directly from Raycast with flexible layouts, rich Spotlight metadata, Finder tags, and quick actions.

## Commands

### Browse Directory

Open a folder and navigate its contents without leaving Raycast.

- Browse directories in List or Grid view.
- Sort items by name, kind, dates, size, or tags.
- Inspect files and folders with rich metadata, inline previews, Finder tags, comments, and folder summaries.
- Open folders, reveal items in Finder, copy paths, copy or move files, create folders, move items to Trash, and edit item metadata.
- Choose whether `⏎` opens item details or opens the item directly.

### Browse Tags

Browse all Finder tags and open the files associated with each tag.

- View Finder tags in List or Grid view.
- Open a tag to browse its tagged folders and files.
- Use the same item actions available in directory browsing, including previewing, opening, copying, moving, and editing metadata.

### Find Files

Describe what you want to find in natural language and search with Spotlight-powered results.

- Search for files by describing their type, name, date, location, or other Spotlight metadata.
- Reuse recent searches from the history list.
- Open **Edit Search** to review and adjust generated search conditions, scope, and search depth before rerunning.
- Use **Search Depth** to choose how folder scopes are handled:
  - **This Folder Only** searches direct children of the selected folder.
  - **This Folder and Subfolders** searches recursively inside the selected folder.

## Preferences

- **Start Directory**: Choose the folder that loads when Browse Directory opens. Defaults to your home directory.
- **Default View Mode**: Pick between `List` and `Grid`.
- **Grid Columns**: Configure the number of columns (4–8) used when the grid view is active.
- **Default Sort**: Select the initial sort order (`Name`, `Kind`, `Date Last Opened`, `Date Added`, `Date Modified`, `Date Created`, `Size`, `Tags`).
- **Enter Key Action**: Choose what happens when pressing Enter on an item (`Show Item Detail` or `Open Item`). Defaults to detail view.
- **Appearance**
  - **Show Hidden Items**: Display items that are marked as hidden. Default: On.
  - **Show Last Used**: Show the last used date as a list accessory. Default: Off.
  - **Show Tags**: Show Finder tags as list accessories. Default: On.
  - **Show File Size**: Show file size as a list accessory. Default: On.
  - **Show Attribute Changed**: Show attribute change date as a list accessory. Default: Off.
  - **Show Created**: Show creation date as a list accessory. Default: Off.
  - **Show Content Changed**: Show content change date as a list accessory. Default: Off.

## Notes

- File metadata and search results are powered by macOS Spotlight.
- The extension bundles a small native Spotlight helper built from the Rust source in `native/`. If you change native code, run `npm run build:native` before building the extension.
- Access to protected macOS folders may require granting Raycast the relevant system permission.

## Development

1. Follow the official contribution guide: [Contribute to an Extension](https://developers.raycast.com/basics/contribute-to-an-extension).
2. If you touched the native Spotlight helper (Rust), run `npm run build:native` to rebuild and copy the updated binaries into `assets/`.
3. Run `npm run lint` and `npm run build` before submitting the extension for review.
4. For additional setup and publishing steps, refer to the Raycast documentation.
