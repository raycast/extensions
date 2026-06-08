#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
NATIVE_DIR="$ROOT_DIR/raycast/native"
SCRATCH_DIR="$ROOT_DIR/raycast/.raycast-swift-build"
OUTPUT_DIR="$ROOT_DIR/raycast/assets/bin"
OUTPUT_BIN="$OUTPUT_DIR/fp-progress"
CONFIGURATION="${1:-release}"

case "$CONFIGURATION" in
  debug|release)
    ;;
  *)
    printf "Usage: %s [debug|release]\n" "$0" >&2
    exit 2
    ;;
esac

"$ROOT_DIR/raycast/scripts/sync-native.sh"
"$ROOT_DIR/raycast/scripts/verify-native.sh"
swift build --package-path "$NATIVE_DIR" --scratch-path "$SCRATCH_DIR" -c "$CONFIGURATION" --arch arm64 --arch x86_64

case "$CONFIGURATION" in
  debug)
    PRODUCT_CONFIGURATION="Debug"
    ;;
  release)
    PRODUCT_CONFIGURATION="Release"
    ;;
esac

mkdir -p "$OUTPUT_DIR"
cp "$SCRATCH_DIR/apple/Products/$PRODUCT_CONFIGURATION/fp-progress" "$OUTPUT_BIN"
chmod +x "$OUTPUT_BIN"
lipo "$OUTPUT_BIN" -verify_arch arm64 x86_64

printf "Bundled universal %s build at %s\n" "$CONFIGURATION" "$OUTPUT_BIN"
