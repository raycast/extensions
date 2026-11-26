#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
for arch in arm64 x86_64; do
  cp native/Player.swift "$stage/main.swift"
  xcrun swiftc -O -target "$arch-apple-macos13" "$stage/main.swift" native/Reader.swift -o "$stage/$arch"
done
xcrun lipo -create "$stage/arm64" "$stage/x86_64" -output assets/SpeakPlayer
codesign --force --sign - assets/SpeakPlayer
