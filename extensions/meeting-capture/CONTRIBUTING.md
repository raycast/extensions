# Contributing and Reproducible Builds

## Requirements

- macOS 27 SDK and Xcode command-line tools
- Node.js with npm
- Raycast

## Validate TypeScript and metadata

```bash
npm ci
npm test
npm run lint
npm run build
```

## Build the native assets

```bash
./script/build_lame.sh
./script/build_and_run.sh --verify
```

`build_lame.sh` downloads the official LAME 3.100 source archive, verifies its pinned SHA-256, builds separate arm64 and x86_64 executables, and combines them with `lipo`. `build_and_run.sh` builds the SwiftPM helper for both architectures, assembles the app bundle, embeds LAME, clears extended attributes, and ad-hoc signs the nested executable and outer bundle.

Verify the result with:

```bash
file vendor/lame assets/MeetingCaptureHelper.app/Contents/MacOS/MeetingCaptureHelper
codesign --verify --strict --verbose=4 assets/MeetingCaptureHelper.app
codesign --verify --strict --verbose=4 assets/MeetingCaptureHelper.app/Contents/Resources/lame
```

The generated app is intentionally ad-hoc signed. Public distribution and inclusion of bundled binaries remain subject to Raycast review.
