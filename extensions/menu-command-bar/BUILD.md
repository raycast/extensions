# Menu Command Bar v01 — Build Notes

## Swift helper

The helper binary `assets/menubar-helper` walks the frontmost app's menu bar via the macOS Accessibility API and either lists items as JSON or invokes one. It is a universal Mach-O so the extension runs on both Apple Silicon and Intel.

### Source

The full Swift source is `assets/menubar-helper.swift`. There are no external dependencies — only `AppKit` and `ApplicationServices` from the macOS SDK.

### Reproducible rebuild

From the project root:

```bash
cd assets
swiftc -O -target arm64-apple-macos11   menubar-helper.swift -o menubar-helper-arm64
swiftc -O -target x86_64-apple-macos11  menubar-helper.swift -o menubar-helper-x86_64
lipo -create menubar-helper-arm64 menubar-helper-x86_64 -output menubar-helper
rm menubar-helper-arm64 menubar-helper-x86_64
```

Confirm the output is universal:

```bash
file menubar-helper
# Mach-O universal binary with 2 architectures: [x86_64] [arm64]
```

### Build provenance for the binary committed to this PR

- **Toolchain**: Apple Swift 6.3.1 (`swiftc --version` → `swift-driver 1.148.6 / Apple Swift version 6.3.1 (swiftlang-6.3.1.1.2 clang-2100.0.123.102)`).
- **Build flags**: exactly the commands above (`-O`, two `-target` builds, then `lipo -create`).
- **SHA-256 of `assets/menubar-helper`**:
  ```
  68e4d9181870fbd2cc237a60e6a9150d4a334da3543aa5353fa1505602c7135f
  ```

Reviewers can rebuild from source and compare the resulting binary's behavior. Note: Swift binaries are not byte-for-byte reproducible across machines (timestamps, build paths, randomized symbol orderings), so the SHA above is for the specific binary committed; rebuilt outputs will differ in bytes but be functionally equivalent.

## Raycast extension

```bash
npm install
npm run dev    # opens Raycast in dev mode with hot reload
```

## Accessibility permission

The helper inherits permissions from its parent process. Raycast already has Accessibility — when Raycast spawns the helper, the API calls succeed. Running the helper from a terminal will fail with `no menu bar (accessibility permission?)` unless the terminal itself has Accessibility, which is expected.
