# Native Helper Build

The menu-bar countdown and completion panel are implemented in
`assets/task-menubar.swift`. The TypeScript launcher in `src/native-menu-bar.ts`
selects the helper using the first 16 hexadecimal characters of the source's
SHA-256 digest and the Node.js CPU architecture. It does not download executables.

The current bundled helper is for Apple Silicon (`arm64`). If no matching
bundled helper exists, the extension compiles the source on the user's Mac
using `/usr/bin/xcrun swiftc` and caches it in the extension support directory.
This fallback requires Xcode Command Line Tools. Intel support has not been
tested and should be verified before claiming equivalent support.

## Reproduce the bundled helper on an Apple Silicon Mac

From the extension directory, with Xcode Command Line Tools installed:

```sh
task_source_hash=$(shasum -a 256 assets/task-menubar.swift | cut -c 1-16)
xcrun swiftc assets/task-menubar.swift -O -target arm64-apple-macosx14.0 -o "assets/task-menubar-${task_source_hash}-arm64"
"assets/task-menubar-${task_source_hash}-arm64" --self-test
"assets/task-menubar-${task_source_hash}-arm64" --ui-self-test
```

The UI self-test briefly creates and closes a synthetic completion panel,
without reading or changing a real task session. The state tests check pause,
resume, completion, and extension behavior. Bundled binaries are generated
from the source; they are not a separate proprietary dependency. Compiler and
SDK versions can affect binary output even when the source digest is identical.
The release binary targets macOS 14 or newer. It was built with Apple Swift
6.3.3 and the macOS 26.5 SDK. The original timer icon can be regenerated with
`xcrun swift scripts/generate-icon.swift assets/extension-icon.png`.

## Store submission

Confirm the Raycast account handle in `package.json`, replace the default icon,
remove obsolete generated helpers from the submission, and capture actual
extension screenshots (not concept images). Then run:

```sh
npm ci
npm run lint
npm run build
npm run publish
```

The public Store submission creates a pull request in `raycast/extensions`.
The native binary and custom AppKit panel should be called out in the pull
request for the Raycast reviewers. Store acceptance is not guaranteed.
