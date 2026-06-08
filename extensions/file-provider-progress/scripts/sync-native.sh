#!/bin/sh
set -eu

ROOT_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SOURCE_DIR="$ROOT_DIR/native"
DEST_DIR="$ROOT_DIR/raycast/native"

if [ ! -d "$SOURCE_DIR" ]; then
  printf "Missing native source at %s\n" "$SOURCE_DIR" >&2
  exit 1
fi

mkdir -p "$DEST_DIR"
rsync -a --delete \
  --exclude ".build/" \
  --exclude ".swiftpm/" \
  --exclude ".DS_Store" \
  "$SOURCE_DIR/" "$DEST_DIR/"

cat > "$DEST_DIR/README.md" <<'EOF'
# Native Source Mirror

This directory is generated from `../../native` by `scripts/sync-native.sh`.

The root `native/` package is the source of truth. This mirror exists so the
Raycast Store submission contains the Swift source used to build the bundled
`assets/bin/fp-progress` helper.
EOF

printf "Synced native source into %s\n" "$DEST_DIR"
