#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
BUILD_DIR="$PROJECT_DIR/native/.build"
SDK_PATH="$(xcrun --sdk macosx --show-sdk-path)"
SOURCE="$PROJECT_DIR/native/BooxLens.swift"
TEST_SOURCE="$PROJECT_DIR/native/BooxLensTests.swift"
OUTPUT="$PROJECT_DIR/assets/boox-lens"
export CLANG_MODULE_CACHE_PATH="$BUILD_DIR/module-cache"
export SWIFT_MODULECACHE_PATH="$BUILD_DIR/module-cache"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"

xcrun --sdk macosx swiftc -swift-version 5 -O -parse-as-library -sdk "$SDK_PATH" -framework AppKit -framework Foundation "$SOURCE" "$TEST_SOURCE" -o "$BUILD_DIR/boox-lens-tests"
"$BUILD_DIR/boox-lens-tests"

xcrun --sdk macosx swiftc -swift-version 5 -O -parse-as-library -D BOOX_LENS_APP -target arm64-apple-macosx13.0 -sdk "$SDK_PATH" -framework AppKit -framework Foundation "$SOURCE" -o "$BUILD_DIR/boox-lens-arm64"
xcrun --sdk macosx swiftc -swift-version 5 -O -parse-as-library -D BOOX_LENS_APP -target x86_64-apple-macosx13.0 -sdk "$SDK_PATH" -framework AppKit -framework Foundation "$SOURCE" -o "$BUILD_DIR/boox-lens-x86_64"
lipo -create "$BUILD_DIR/boox-lens-arm64" "$BUILD_DIR/boox-lens-x86_64" -output "$OUTPUT"
chmod 755 "$OUTPUT"
codesign --force --sign - "$OUTPUT"
codesign --verify --strict "$OUTPUT"

xcrun --sdk macosx swiftc -swift-version 5 -O -framework AppKit -framework Foundation "$PROJECT_DIR/scripts/GenerateIcon.swift" -o "$BUILD_DIR/generate-icon"
"$BUILD_DIR/generate-icon" "$PROJECT_DIR/assets/extension-icon.png"

rm -rf "$BUILD_DIR"
