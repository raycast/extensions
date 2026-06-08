#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE_DIR="$ROOT_DIR/native"
DEST_DIR="$ROOT_DIR/raycast/native"

if [ ! -d "$DEST_DIR" ]; then
  printf "Missing Raycast native mirror at %s\n" "$DEST_DIR" >&2
  printf "Run: make raycast-sync-native\n" >&2
  exit 1
fi

if ! diff -qr \
  -x ".build" \
  -x ".swiftpm" \
  -x ".DS_Store" \
  -x "README.md" \
  "$SOURCE_DIR" "$DEST_DIR" >/dev/null; then
  printf "raycast/native is out of sync with native.\n" >&2
  printf "Run: make raycast-sync-native\n" >&2
  diff -qr \
    -x ".build" \
    -x ".swiftpm" \
    -x ".DS_Store" \
    -x "README.md" \
    "$SOURCE_DIR" "$DEST_DIR" >&2 || true
  exit 1
fi

printf "raycast/native matches native\n"
