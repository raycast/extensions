# Rex icon extraction

How `assets/glyphs/*.png`, `assets/devices/*.png`, and `src/rex/glyph-catalog.ts` were produced from Rex Beta 0.1.0 (1101). Re-run when Rex ships new program icons.

1. `lipo -thin arm64 -output rex-arm64 "/Applications/Rex Beta.app/Contents/MacOS/Rex"` and `otool -tv rex-arm64 > rex-arm64.asm`; collect stub addresses with `grep -oE 'bl\s+0x[0-9a-f]+ ; symbol stub for: \S+' rex-arm64.asm | sed -E 's/bl\s+//' | sort -u > stubs.txt`.
2. Find the `BlockIconCatalog.packageDefinitions` initializer: it is the function that references the static `commands` alias arrays (search the data segment for the Swift small string `lazygit`) and allocates an object of 32 + 74 × 280 bytes. Update `START`, `END`, and the segment table in `emulate-definitions.py` if the build changed.
3. `python -m venv venv && venv/bin/pip install unicorn && venv/bin/python emulate-definitions.py <dir>` writes `block-icon-definitions.json`.
4. `swift render-glyphs.swift block-icon-definitions.json ../../assets/glyphs` renders the glyph masks out of `SuperBlockIcons_SuperBlockIcons.bundle` (then downscale to 256 px with `sips`), and `swift render-symbols.swift ../../assets/devices` renders the host SF Symbols. `swift render-status.swift ../../assets/status` renders the program-status art (`SettingsIconNoti*`) in light and dark appearance. The pills themselves are painted at runtime by `src/rex/pill-painter.ts`.
5. Regenerate `src/rex/glyph-catalog.ts` from the JSON (glyph, title, colours, gradients, commands).

The artwork belongs to Superlogical and to the programs' owners; it is used here so the extension looks like Rex.
