#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
stage=$(mktemp -d)
trap 'rm -rf "$stage"' EXIT
curl -fsSL --retry 2 https://raw.githubusercontent.com/k2-fsa/sherpa-onnx/v1.12.20/sherpa-onnx/c-api/c-api.h -o "$stage/c-api.h"
printf '%s  %s\n' b575df36a35db0b384a708b05df968846af8c215ae5e9f3b76d35f31620d0ea3 "$stage/c-api.h" | shasum -a 256 -c --status
cp native/Player.swift "$stage/main.swift"
for arch in arm64 x86_64; do
  xcrun clang -O2 -target "$arch-apple-macos13" -I "$stage" -c native/Voice.c -o "$stage/voice.o"
  xcrun swiftc -O -target "$arch-apple-macos13" "$stage/main.swift" native/Reader.swift native/VoiceWorker.swift -import-objc-header native/Voice.h "$stage/voice.o" -o "$stage/$arch"
done
xcrun lipo -create "$stage/arm64" "$stage/x86_64" -output assets/SpeakPlayer
codesign --force --sign - assets/SpeakPlayer
