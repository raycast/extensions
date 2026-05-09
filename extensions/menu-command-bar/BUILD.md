# Menu Command Bar v01 — Build Notes

## Swift helper

The helper binary `assets/menubar-helper` walks the frontmost app's menu bar via the macOS Accessibility API and either lists items as JSON or invokes one. It is a universal binary so the extension runs on both Apple Silicon and Intel.

### Rebuild

From the project root:

```bash
cd assets
swiftc -O -target arm64-apple-macos11   menubar-helper.swift -o menubar-helper-arm64
swiftc -O -target x86_64-apple-macos11  menubar-helper.swift -o menubar-helper-x86_64
lipo -create menubar-helper-arm64 menubar-helper-x86_64 -output menubar-helper
rm menubar-helper-arm64 menubar-helper-x86_64
```

Confirm:

```bash
file menubar-helper
# Mach-O universal binary with 2 architectures: [x86_64] [arm64]
```

## Raycast extension

```bash
npm install
npm run dev    # opens Raycast in dev mode with hot reload
```

## Accessibility permission

The helper inherits permissions from its parent process. Raycast already has Accessibility — when Raycast spawns the helper, the API calls succeed. Running the helper from a terminal will fail with `no menu bar (accessibility permission?)` unless the terminal itself has Accessibility, which is expected.
