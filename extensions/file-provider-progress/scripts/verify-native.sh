#!/bin/sh
set -eu

. "$(dirname "$0")/layout.sh"

if [ ! -d "$BUNDLED_NATIVE_DIR" ]; then
  printf "Missing Raycast native source at %s\n" "$BUNDLED_NATIVE_DIR" >&2
  printf "Run: make raycast-sync-native\n" >&2
  exit 1
fi

if [ "$SOURCE_NATIVE_DIR" = "$BUNDLED_NATIVE_DIR" ]; then
  printf "Using bundled native source at %s\n" "$BUNDLED_NATIVE_DIR"
  exit 0
fi

if ! diff -qr \
  -x ".build" \
  -x ".swiftpm" \
  -x ".DS_Store" \
  -x "README.md" \
  "$SOURCE_NATIVE_DIR" "$BUNDLED_NATIVE_DIR" >/dev/null; then
  printf "raycast/native is out of sync with native.\n" >&2
  printf "Run: make raycast-sync-native\n" >&2
  diff -qr \
    -x ".build" \
    -x ".swiftpm" \
    -x ".DS_Store" \
    -x "README.md" \
    "$SOURCE_NATIVE_DIR" "$BUNDLED_NATIVE_DIR" >&2 || true
  exit 1
fi

printf "raycast/native matches native\n"
