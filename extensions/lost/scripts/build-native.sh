#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/swift/LostWindows.swift"
OUT="$ROOT/assets/lost-windows"
MACOS_MIN="${MACOS_MIN:-13.0}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

mkdir -p "$ROOT/assets"

xcrun swiftc -O -target "arm64-apple-macos${MACOS_MIN}" \
  -o "$TMP/lost-windows-arm64" "$SRC" \
  -framework AppKit -framework ApplicationServices

xcrun swiftc -O -target "x86_64-apple-macos${MACOS_MIN}" \
  -o "$TMP/lost-windows-x86_64" "$SRC" \
  -framework AppKit -framework ApplicationServices

lipo -create -output "$OUT" "$TMP/lost-windows-arm64" "$TMP/lost-windows-x86_64"
chmod +x "$OUT"
codesign -s - --force "$OUT"
file "$OUT"
