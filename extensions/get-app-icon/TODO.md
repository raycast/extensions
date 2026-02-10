# TODO

- [x] Add support for exporting to other formats (e.g. JPG, ICNS)
- [x] Missing Info.plist or icon file — getAppIconPath will throw an unhandled error if an app doesn't have a CFBundleIconFile key (e.g. some Electron apps, or apps using CFBundleIconName for Asset Catalog icons instead). You should catch this gracefully and show a user-friendly message like "This app's icon format is not supported."
- [x] sips failures — Some .icns files may not contain all requested sizes. sips will still run but may produce unexpected results (upscaling a 512px source to 1024px). Consider warning the user or noting which sizes are native.
- [x] Keyboard shortcuts — Add shortcut props to your primary actions. E.g., ⌘E for Export, ⌘C or ⌘⇧C for the Copy submenu. This makes the extension feel polished.
- [x] icon on actions — Add Icon.Download to "Export Icons" and Icon.Clipboard to "Copy App Icon" for visual clarity in the action panel.
- [x] Empty state — If apps resolves to an empty array, the list is blank with no explanation. Consider an <List.EmptyView> component.
- [x] Accessories on list items — You could show the bundle identifier or app version as an accessory, which helps disambiguate apps with the same name (e.g., multiple "Python" installations).
- [x] "Reveal in Finder" as a standalone action — Currently it's only available as a toast action after export. Consider adding it as a secondary ActionPanel action that opens the app's existing export folder (if it exists).
- [x] "Copy App Name" / "Open App" actions — Low-effort additions that round out the action panel and are common in Raycast app-listing extensions.
- [x] Hardcoded sips and plutil — Fine for macOS-only, but consider a brief comment explaining why, for future maintainers.
- [x] Sequential icon export — `exportIcons` processes sizes in a for loop. Since each sips call is independent, use `Promise.all` to parallelize and speed up export of multiple sizes.
- [x] add an "Export All Sizes" action in the action panel that ignores preferences and exports everything as a one-off.
- [x] Update README.md to improve description and functionality details
  - [x] Mention the "Copy" feature — The README's "Actions" section says "Export PNGs" and "Copy App Icon" but doesn't explain the copy feature copies to clipboard as an image (not a file path). Clarify this.
  - [x] Add a "Limitations" section — Note that it only works with .icns-based icons, not Asset Catalog (Assets.car) icons, which some modern apps use.
