# Music catalog playback — development and review

## Architecture

Search, Just Play's catalog fallback and the catalog AI tool share `src/util/catalog-playback.ts`. The helper receives the exact catalog song ID; it does not open Music URLs, click UI elements or add library entries. It replaces the playback queue. Volume and shuffle are not modified.

The TypeScript caller serializes catalog requests with a native lock, launches the helper through LaunchServices and verifies the result independently using Music's AppleScript interface. The verification script is fixed: title, artist and album are supplied as separate `argv` values, never interpolated into executable source.

A verification/native error is not proof that the extension still owns the current playback. The user or another controller can have changed tracks. Without a reliable playback-session token, neither an unconditional pause nor a metadata-only ownership guess is safe. Error handling therefore reports the failure and makes no additional playback mutation. It cannot promise to restore the old queue or stop an unverified native attempt.

## Build and tests

Run from the extension root:

```sh
npm test
npx tsc --noEmit
npm run build
npm run lint
```

After changing native sources, run `npm run build:native` on macOS with Xcode Command Line Tools. The build script creates an arm64/x86_64 app and verifies its ad-hoc signature. Regular TypeScript builds reuse that asset. Rebuilding the executable may require granting Music access again; avoid unnecessary rebuilds.

The regression suite covers argument separation, verification failures without playback cleanup, native transport, locking, confirmation metadata, library fallback and existing Music operations. macOS-only tests compile the verification AppleScript and round-trip hostile-looking metadata as data without playing a song.

The first three `ai.evals` entries in `package.json` cover catalog search-to-play with the exact returned ID, search without playback, and no matching result. Their catalog data is synthetic, and tool calls are mocked. Run them with:

```sh
npx ray evals --only 0-2
```

See [Raycast AI Evals](https://developers.raycast.com/ai/evals). A passing mocked eval is not a live Apple Music test. Test the real Search, Ask and Just Play commands, permission denial, minimized windows and manual track changes separately on supported hardware.

## Distribution and compatibility review

The MediaPlayer system-player methods used here exist at runtime but are **not public macOS SDK APIs**. The successful local tests on macOS 27 / Apple silicon do not establish support for other macOS releases or Intel hardware. Compiling an Intel slice is not hardware validation. Unsupported methods fail explicitly, without a URL/UI fallback.

The current helper is ad-hoc signed for local development, not Developer ID signed or notarized. Before public distribution, maintainers need to decide whether the unsupported native interface is acceptable, who owns the signing identity and release process, and how clean-machine installation, permissions and updates will be validated.

See [Raycast's binary dependency guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store#binary-dependencies-and-additional-configuration) and [Apple's notarization documentation](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution). Notarization does not make an unsupported API a supported one.
