# Native helper review

The extension uses AppKit's `NSSharingService` to invoke QuickDrop's sharing extension (`com.leonboettger.neardrop.ShareExtension`). It cannot implement that API through the Raycast JavaScript API alone. QuickDrop itself is not bundled or downloaded.

## Source and construction

All helper source is in `native/main.swift`; its bundle metadata is in `native/Info.plist`. `scripts/build-native.sh` compiles both arm64 and x86_64 with the installed Swift compiler, combines them using `lipo`, and applies and verifies an ad hoc signature. The minimum deployment target is read from the plist. No runtime compiler or network download is required on the user's machine.

Rebuild from this submission on a Mac with Xcode Command Line Tools:

```bash
npm run build:native
xcrun lipo assets/QuickDropcastBridge.app/Contents/MacOS/QuickDropcastBridge -verify_arch arm64
xcrun lipo assets/QuickDropcastBridge.app/Contents/MacOS/QuickDropcastBridge -verify_arch x86_64
codesign --verify --strict assets/QuickDropcastBridge.app
```

`native/provenance.json` records the compiler, SDK, target architectures, and SHA-256 hashes of the source, build script, plist, and submitted executable. It describes this build, not a guarantee of byte-for-byte reproducibility across toolchains. Reviewers can inspect the hashes and rebuild from the supplied source. The signature is ad hoc, not Developer ID signed or notarized.

## Runtime behavior

The extension launches the bundled helper directly with `spawn`, passing JSON over stdin rather than a shell command. The helper validates text and file paths, opens the sharing service, and emits structured status/error codes. It does not log shared content, access the Keychain, download executables, or add analytics. The service chooses recipients and performs transfers. QuickDropcast cannot confirm delivery.

## Review request

Raycast's [binary dependency guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store#binary-dependencies-and-additional-configuration) require traceable sources and builds. Please review this small bundled helper and confirm the acceptable binary inclusion process before merging. Including source and hashes does not imply Raycast has approved the executable. The project maintainer should follow any requested team-assisted binary inclusion procedure.

Compilation for both architectures is verified separately from execution. Real sharing must also be checked on Apple Silicon and Intel; cross-compilation alone does not establish runtime compatibility.
