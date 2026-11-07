# Building the Lens engine

This standalone engine derives from [DigUp](https://github.com/ARahim3/DigUp) commit `f9b8106ffb8308b4f48b76149d270f7c2e6b4918` under MIT. The app and updater are not included. Internal module names retain their original identifiers.

On Apple Silicon macOS 14+, install Xcode with Swift 6.2 or newer, Git and CMake. From this directory:

```sh
bash scripts/build-release.sh
swift test -j 2
```

The build script fetches llama.cpp tag `b11461`, checks commit `4d756bc72bf00a4aacf410ae15a2d315f3db400d`, applies `scripts/llama.cpp-no-logits.patch`, and embeds its Metal shaders. C/C++ and Swift source paths are remapped to `/usr/src/lens`. Both native builds use at most two workers. The resulting executable is stripped, ad-hoc signed and copied to `../assets/digup`.

`../ENGINE-BUILD.json` records the distributed executable's SHA-256, source hashes, toolchain and SDK versions. Source and build commands are traceable; this is not a promise of byte-identical output across SDK/toolchain versions or a signed build attestation. The release targets arm64 only and is not notarized separately.

Only Apple system frameworks/libraries are dynamically linked. Model weights download separately from pinned, checksum-verified URLs; they are not bundled here. See `../MODEL-NOTICES.md` and `../assets/Acknowledgements.txt` for attribution and licenses.

To inspect this build without touching an existing Raycast installation, run `npm run build` from the extension directory; its output is explicitly `dist/`. Do not use `ray develop` merely to reproduce a release build.
