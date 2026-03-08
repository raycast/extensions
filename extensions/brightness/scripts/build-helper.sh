#!/bin/sh
set -eu

ROOT_DIR=$(CDPATH= cd -- "$(dirname "$0")/.." && pwd)
SOURCE_PATH="$ROOT_DIR/assets/BrightnessHelper.swift"
BINARY_PATH="$ROOT_DIR/assets/brightness-helper"
ARM64_BINARY_PATH="${BINARY_PATH}-arm64"
X64_BINARY_PATH="${BINARY_PATH}-x86_64"

/usr/bin/xcrun swiftc -O -target arm64-apple-macos12.0 "$SOURCE_PATH" -o "$ARM64_BINARY_PATH"
/usr/bin/xcrun swiftc -O -target x86_64-apple-macos12.0 "$SOURCE_PATH" -o "$X64_BINARY_PATH"
/usr/bin/lipo -create -output "$BINARY_PATH" "$ARM64_BINARY_PATH" "$X64_BINARY_PATH"
/bin/rm -f "$ARM64_BINARY_PATH" "$X64_BINARY_PATH"
/bin/chmod 755 "$BINARY_PATH"
