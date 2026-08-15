#!/bin/zsh

set -euo pipefail

SCRIPT_DIR=${0:A:h}
PROJECT_DIR=${SCRIPT_DIR:h}
SOURCE_PATH="$PROJECT_DIR/native/rime-manager-auth.swift"
OUTPUT_PATH="$PROJECT_DIR/assets/rime-manager-auth"
BUILD_DIR=$(mktemp -d "${TMPDIR:-/tmp}/rime-manager-auth.XXXXXX")

cleanup() {
  rm -rf "$BUILD_DIR"
}
trap cleanup EXIT

SDK_PATH=$(xcrun --sdk macosx --show-sdk-path)
MODULE_CACHE_PATH="$BUILD_DIR/module-cache"
mkdir -p "$MODULE_CACHE_PATH"

xcrun swiftc -parse-as-library -O -module-cache-path "$MODULE_CACHE_PATH" -target arm64-apple-macos13.0 -sdk "$SDK_PATH" "$SOURCE_PATH" -o "$BUILD_DIR/auth-arm64"
xcrun swiftc -parse-as-library -O -module-cache-path "$MODULE_CACHE_PATH" -target x86_64-apple-macos13.0 -sdk "$SDK_PATH" "$SOURCE_PATH" -o "$BUILD_DIR/auth-x86_64"
xcrun lipo -create "$BUILD_DIR/auth-arm64" "$BUILD_DIR/auth-x86_64" -output "$OUTPUT_PATH"
chmod 755 "$OUTPUT_PATH"

file "$OUTPUT_PATH"
shasum -a 256 "$OUTPUT_PATH"
