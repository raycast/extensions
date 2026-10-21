#!/bin/bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ASSET_DIR="$ROOT_DIR/assets"
OUTPUT="$ASSET_DIR/native-bridge"

mkdir -p "$ASSET_DIR"

# Raycast's build workers may run outside macOS. Reuse the checked-in universal
# helper there; the source and reproducible build steps live in native/ and this script.
if [ "$(uname -s)" != "Darwin" ]; then
  if [ -x "$OUTPUT" ]; then
    echo "Using the checked-in universal macOS native bridge."
    exit 0
  fi
  echo "The universal macOS native bridge is missing. Build it on macOS first." >&2
  exit 1
fi

TEMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TEMP_DIR"' EXIT

for ARCH in arm64 x86_64; do
  TARGET="$ARCH-apple-macosx13.0"
  swiftc -O \
    -module-cache-path "$TEMP_DIR/module-cache-$ARCH" \
    -target "$TARGET" \
    "$ROOT_DIR/native/main.swift" \
    -o "$TEMP_DIR/native-bridge-$ARCH"
done

lipo -create \
  "$TEMP_DIR/native-bridge-arm64" \
  "$TEMP_DIR/native-bridge-x86_64" \
  -output "$TEMP_DIR/native-bridge"

chmod 755 "$TEMP_DIR/native-bridge"
ARCHS="$(lipo -archs "$TEMP_DIR/native-bridge")"
if [[ "$ARCHS" != *arm64* || "$ARCHS" != *x86_64* ]]; then
  echo "Expected a universal arm64 + x86_64 native bridge; got: $ARCHS" >&2
  exit 1
fi

mv "$TEMP_DIR/native-bridge" "$OUTPUT"
swift -module-cache-path "$TEMP_DIR/icon-module-cache" \
  "$ROOT_DIR/native/build-icon.swift" "$ASSET_DIR/extension-icon.png"

# NSImage can render a 512-point canvas as a 1024-pixel Retina bitmap.
# Raycast validates the PNG's pixel dimensions, so normalize the output.
sips -z 512 512 "$ASSET_DIR/extension-icon.png" >/dev/null

echo "Built universal native bridge for: $ARCHS"
