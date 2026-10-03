# Display Switch native helper

`DisplayControl.swift` is the complete, independently written MIT-licensed source
of both helper executables in `assets/`. Neither binary downloads code, uses
network access, installs services, nor requests administrator access.

The architecture-specific helpers are small Mach-O executables. `backend.ts`
selects the correct helper with `process.arch` and launches it with `execFile`
and a structured argument array. The process inspects macOS display inventory,
applies a session-scoped display configuration change, and returns JSON.

## Build and provenance

On macOS with Xcode Command Line Tools, run:

```sh
npm run build:native
```

This invokes `xcrun swiftc -O -target ARCH-apple-macosx13.0` for arm64 and x86_64
using only Apple's AppKit, CoreGraphics, Foundation, and Darwin libraries. Each
binary is ad-hoc signed with `codesign --force --sign -`. There are no third-party
native dependencies. The exact command sequence is in `scripts/build-helper.mjs`.

`build-manifest.json` contains SHA-256 hashes of the Swift source and each signed
executable, plus compiler/deployment-target information. `npm run build` verifies
those hashes before bundling. The standalone project's macOS CI rebuilds both
executables from this source and packages them into its downloadable artifact.
Hashes need not reproduce across different compiler/SDK/signing versions; reviewers
can rebuild from the provided source using their own trusted toolchain.

The helpers are included in source because the Raycast/Tinycast build pipeline
can invoke `ray build` directly rather than our custom native build script.
Bundling them permits installation without an extra dependency or developer tools.
Reviewers can inspect the source and replace both executables with their own build.

## Private macOS APIs

The helper dynamically resolves `SLSConfigureDisplayEnabled` and
`SLSGetDisplayList` from SkyLight, with `CGS*` fallbacks. macOS provides no public
individual-display disable API. No private framework is linked at build time.
The helper rejects disabling if its recovery function is unavailable, writes
and flushes recovery identity before a display can disappear from public lists,
blocks the last independent active screen, and verifies changes by state readback.

Metadata and a process lock are stored under
`~/Library/Application Support/Display Switch/`. Changes last only for the
current macOS login session. Hardware and OS compatibility limits are documented
in the extension README and VALIDATION.md.
