#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
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

swift build --package-path "$ROOT_DIR/native" -c "$CONFIGURATION" --arch arm64 --arch x86_64

case "$CONFIGURATION" in
  debug)
    PRODUCT_CONFIGURATION="Debug"
    ;;
  release)
    PRODUCT_CONFIGURATION="Release"
    ;;
esac

mkdir -p "$OUTPUT_DIR"
cp "$ROOT_DIR/native/.build/apple/Products/$PRODUCT_CONFIGURATION/fp-progress" "$OUTPUT_BIN"
chmod +x "$OUTPUT_BIN"

printf "Bundled universal %s build at %s\n" "$CONFIGURATION" "$OUTPUT_BIN"
