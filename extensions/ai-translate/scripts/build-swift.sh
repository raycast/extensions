#!/usr/bin/env bash
set -euo pipefail

mkdir -p assets

if swift build --configuration release --arch arm64 --arch x86_64; then
  cp .build/apple/Products/Release/recognizeText assets/recognizeText
else
  sdk_path="$(xcrun --sdk macosx --show-sdk-path)"
  fallback_dir=".build/recognizeText-fallback"
  mkdir -p "$fallback_dir"

  # Apple Silicon cannot target macOS before 11.0; Intel remains compatible with 10.15.
  swiftc -target arm64-apple-macos11.0 \
    -sdk "$sdk_path" \
    Sources/recognizeText/main.swift \
    -framework Cocoa \
    -framework Vision \
    -o "$fallback_dir/recognizeText-arm64"

  swiftc -target x86_64-apple-macos10.15 \
    -sdk "$sdk_path" \
    Sources/recognizeText/main.swift \
    -framework Cocoa \
    -framework Vision \
    -o "$fallback_dir/recognizeText-x86_64"

  xcrun lipo -create \
    "$fallback_dir/recognizeText-arm64" \
    "$fallback_dir/recognizeText-x86_64" \
    -output assets/recognizeText
fi

xcrun lipo assets/recognizeText -verify_arch arm64 x86_64
chmod 755 assets/recognizeText
