#!/bin/sh
# Builds the universal (Apple Silicon + Intel) lock helper into assets/.
set -e
cd "$(dirname "$0")/.."

SRC=assets/input-lock-helper.swift
OUT=assets/input-lock-helper
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

for arch in arm64 x86_64; do
  xcrun swiftc -O -swift-version 5 -target "$arch-apple-macos12" -o "$TMP/$arch" "$SRC"
done
lipo -create -output "$OUT" "$TMP/arm64" "$TMP/x86_64"
echo "built $OUT ($(lipo -archs "$OUT"))"
