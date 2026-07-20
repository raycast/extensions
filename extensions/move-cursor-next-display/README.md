# Move Cursor Displays

Raycast extension plus a Swift helper, connected through Raycast's official Swift bridge, for moving the macOS mouse cursor between displays. The commands have no UI: run one command and the cursor jumps immediately.

## What It Does

- Reads the current cursor position.
- Finds the display containing the cursor.
- Sorts displays left to right, then top to bottom when `x` is equal.
- Moves to the next or previous display, wrapping at either end.
- Preserves the cursor's relative `x` and `y` position inside the display.
- Supports center commands that move to the target display center instead.
- Clamps the final point inside the target display bounds.
- Shows a readable message when there is only one display.

## Project Structure

```text
.
├── assets
│   └── icon.png
├── src
│   ├── move-cursor-command.ts
│   ├── move-cursor-next-display-center.ts
│   ├── move-cursor-next-display.ts
│   ├── move-cursor-previous-display-center.ts
│   ├── move-cursor-previous-display.ts
│   └── swift-bridge.d.ts
├── swift
│   └── movecursor
│       ├── Package.swift
│       └── Sources
│           └── movecursor.swift
├── CHANGELOG.md
├── package.json
├── tsconfig.json
└── README.md
```

The Swift helper is source code under `swift/movecursor`. Raycast builds and invokes it through `swift:../swift/movecursor`; no checked-in native binary is required.

## Setup

1. Install Xcode. Raycast's Swift bridge currently requires Xcode to build Swift packages.

2. Create a Raycast extension:

   ```bash
   npm create raycast-extension@latest
   ```

3. Choose a no-view TypeScript extension, then replace the generated files with this project's files.

4. Install dependencies:

   ```bash
   npm install
   ```

5. Run the extension in Raycast development mode:

   ```bash
   npm run dev
   ```

6. In Raycast, run one of:

   ```text
   Move Cursor to Next Display
   Move Cursor to Previous Display
   Move Cursor to Next Display Center
   Move Cursor to Previous Display Center
   ```

## Publish

Raycast's publish command copies the extension directory into a fork before opening a Store PR. Clean local Swift build output first:

```bash
npm run clean:publish
npm run publish
```

## Permissions

The helper uses CoreGraphics and `CGWarpMouseCursorPosition`. If macOS blocks cursor movement, grant permission in:

```text
System Settings > Privacy & Security > Accessibility
```

Add Raycast while developing.

## Common Failures

- Swift bridge build errors: install or update Xcode, then rerun `npm run dev`.
- `xcodebuild failed to load a required plug-in`: run `xcodebuild -runFirstLaunch`; if it still fails, update or reinstall Xcode.
- `ENOTSUP ... swift/movecursor/.build/debug`: run `npm run clean:publish`, then publish again.
- `Only one display detected`: macOS currently reports a single active display.
- `macOS rejected cursor movement`: grant Accessibility permission to Raycast and try again.

## Notes

The extension uses Raycast's Swift bridge instead of checking in a prebuilt native executable. That keeps the native code reviewable and avoids binary architecture/signing drift during Store review.

## Next Steps

- Add preferences for display sorting strategy.
- Add more commands backed by the same Swift helper.
- Add keyboard shortcut recommendations for each command.
