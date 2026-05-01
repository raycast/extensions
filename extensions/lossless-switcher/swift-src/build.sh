#!/usr/bin/env bash
# Builds universal (arm64+x86_64) binaries from Swift sources into assets/.
# Idempotent. Used by `npm run build-binaries`.
set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$(pwd)"
SRC="$ROOT/swift-src"
OUT="$ROOT/assets"
BUILD="$SRC/build"

mkdir -p "$OUT" "$BUILD/arm64" "$BUILD/x86_64"

build_one() {
    local name=$1
    echo "→ Building $name"
    swiftc -O -target arm64-apple-macos13   -o "$BUILD/arm64/$name"   "$SRC/$name.swift"
    swiftc -O -target x86_64-apple-macos13  -o "$BUILD/x86_64/$name"  "$SRC/$name.swift"
    lipo -create "$BUILD/arm64/$name" "$BUILD/x86_64/$name" -output "$OUT/$name"
    chmod +x "$OUT/$name"
    codesign --sign - --force --preserve-metadata=entitlements "$OUT/$name" 2>/dev/null || codesign --sign - --force "$OUT/$name"
    echo "  ✓ $OUT/$name ($(file -b "$OUT/$name"))"
}

build_one lossless-watcher
build_one audio_format

echo "Done."
