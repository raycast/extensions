# Native helper provenance

App Hopper submits Swift sources and their built executables together for Raycast review. There are no runtime native-code downloads. A Store user should not need Xcode or Command Line Tools.

## Sources and outputs

`assets/native-helpers.json` is the helper inventory. `assets/native/manifest.json` records the source hash and SHA-256 of each executable. All of these files, including the binaries, belong in the submission.

| Helper           | Source                        | Purpose                                      |
| ---------------- | ----------------------------- | -------------------------------------------- |
| `runtime-status` | `assets/runtime-status.swift` | Read Accessibility permission status.        |
| `macos-windows`  | `assets/macos-windows.swift`  | Discover apps/windows and focus a window.    |
| `chromium-ax`    | `assets/chromium-ax.swift`    | Discover and focus Chromium tabs.            |
| `webkit-ax`      | `assets/webkit-ax.swift`      | Discover and focus WebKit tabs.              |
| `firefox-ax`     | `assets/firefox-ax.swift`     | Accessibility fallback for Firefox/Zen tabs. |
| `firefox-bridge` | `assets/firefox-bridge.swift` | Firefox/Zen native messaging host.           |

The three browser AX helpers also compile `assets/browser-tab-references.swift`, `assets/browser-helper-runtime.swift`, and `assets/browser-accessibility.swift`. The window helper and the three browser AX helpers also compile `assets/window-focus.swift`, which owns window restoration, application activation, window raising, and verification of the frontmost process and exact focused window. Their source hashes include all shared files. The Accessibility source owns common attribute access and window discovery; each browser keeps its own scan limits and enhanced-UI policy.

## Rebuild and verify

On macOS with Xcode or Command Line Tools:

```sh
npm ci
npm run build:native
npm run verify:native
```

`scripts/build-native.ts` compiles each helper with `/usr/bin/swiftc -O` for `arm64` and `x86_64`, targeting macOS 13.0, combines the slices with `lipo`, and signs the universal binary. Default signing is ad-hoc; no personal certificate or signing service is used. Existing verified outputs are reused, so remove the generated helper snapshot in a disposable checkout to force a full rebuild.

`scripts/native-helpers.ts` verifies source hashes, binary checksums, both architecture slices, and strict code-signature validity. In the [source repository](https://github.com/chenghsj/app-hopper), `npm run verify:store` also checks listing files, screenshot dimensions, and that the submitted sources and outputs are tracked by Git. It does not establish reproducibility across different Xcode versions, Developer ID certification, notarization, or Store approval.

At runtime, the extension verifies a bundled binary's checksum and selects it using the current Swift source hash. A corrupt binary produces a recovery error. The source repository's [artifact tests](https://github.com/chenghsj/app-hopper/blob/main/tests/native-artifact.test.ts) exercise startup with compiler commands disabled and a fresh support directory.

## Process behavior

- Permission checks and window discovery run short-lived helpers.
- Browser AX helpers use one process per browser with serialized JSON-line requests, preserving exact tab references. A slow browser cannot block or expire another browser's session. Closing stdin ends the session.
- Firefox/Zen owns the native messaging host process. Its stdout is reserved for length-prefixed messages; tab requests travel through per-user Unix sockets. See [Firefox integration](https://github.com/chenghsj/app-hopper/blob/main/docs/firefox-integration.md).
- No browsing history or session-restore files are read. Helpers exchange current tab data through local IPC. Raycast keeps the latest search snapshot, including window/tab titles and URLs, in its local Cache to populate the next launch. Refresh validates live targets; the helpers do not write browser session files.

## Review scope

This preserves the existing CLI, browser-session, and native-messaging protocols. Converting the helpers to exported functions through Raycast's Swift macros would require a separate protocol/lifecycle migration. The current submission therefore includes reviewable source-built binaries and these reconstruction instructions, following Raycast's [binary dependency guidance](https://developers.raycast.com/basics/prepare-an-extension-for-store#binary-dependencies-and-additional-configuration). The Raycast team must review and accept this packaging approach.

Downloaded-install acceptance, Intel hardware execution, Accessibility/Automation permissions, and browser workflows remain explicit checks in the [compatibility guide](https://github.com/chenghsj/app-hopper/blob/main/docs/compatibility.md).
