# TimeZoner Store Screenshots

Raycast Store review requires screenshots in this `metadata/` folder.

Use Raycast Window Capture:

1. Open Raycast Preferences -> Advanced and set a Window Capture hotkey.
2. In this directory, run `npm run dev`.
3. Open each command in Raycast development mode.
4. Press the Window Capture hotkey and tick `Save to Metadata`.

Capture at least these PNGs from the single TimeZoner command:

- `timezoner-world-clock.png`: Empty search showing the saved timezone cards with the map underneath.
- `timezoner-convert-time.png`: Query `3pm in SF` showing converted times across saved zones with source/target map markers.
- `timezoner-edit-time.png`: Selected zone after pressing Enter, with that row's time editable in the search bar.
- `timezoner-add-zone.png`: Add Zone form opened from the action panel.

Raycast's screenshot spec is 2000 x 1250 PNG, landscape, 16:10. Use the same desktop background for all screenshots and avoid showing other apps.

After capture, keep the PNGs in this folder and copy them to `extensions/timezoner/metadata/` in the `raycast/extensions` Store PR branch before pushing the final Store update. Also copy `raycast/ATTRIBUTION.md` with the extension because the bundled timezone map data carries ODbL/OpenStreetMap attribution.
