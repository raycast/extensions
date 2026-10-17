#!/bin/zsh
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE_FILE="$ROOT_DIR/helper-src/keylayout-helper.swift"
OUTPUT_FILE="$ROOT_DIR/assets/kommand-keylayout-helper"
BUILD_DIR="$(mktemp -d)"
MODULE_CACHE_DIR="$(mktemp -d)"

cleanup() {
  rm -rf "$BUILD_DIR" "$MODULE_CACHE_DIR"
}
trap cleanup EXIT

CLANG_MODULE_CACHE_PATH="$MODULE_CACHE_DIR" xcrun swiftc \
  -target arm64-apple-macos12.0 \
  "$SOURCE_FILE" \
  -o "$BUILD_DIR/kommand-keylayout-helper-arm64"

CLANG_MODULE_CACHE_PATH="$MODULE_CACHE_DIR" xcrun swiftc \
  -target x86_64-apple-macos12.0 \
  "$SOURCE_FILE" \
  -o "$BUILD_DIR/kommand-keylayout-helper-x86_64"

lipo -create \
  -output "$OUTPUT_FILE" \
  "$BUILD_DIR/kommand-keylayout-helper-arm64" \
  "$BUILD_DIR/kommand-keylayout-helper-x86_64"

chmod +x "$OUTPUT_FILE"
file "$OUTPUT_FILE"
