#!/bin/sh
set -eu

. "$(dirname "$0")/layout.sh"

if [ ! -d "$SOURCE_NATIVE_DIR" ]; then
  printf "Missing native source at %s\n" "$SOURCE_NATIVE_DIR" >&2
  exit 1
fi

if [ "$SOURCE_NATIVE_DIR" = "$BUNDLED_NATIVE_DIR" ]; then
  printf "Using bundled native source at %s\n" "$BUNDLED_NATIVE_DIR"
  exit 0
fi

mkdir -p "$BUNDLED_NATIVE_DIR"
rsync -a --delete \
  --exclude ".build/" \
  --exclude ".swiftpm/" \
  --exclude ".DS_Store" \
  "$SOURCE_NATIVE_DIR/" "$BUNDLED_NATIVE_DIR/"

cat > "$BUNDLED_NATIVE_DIR/README.md" <<'EOF'
# Native Source Mirror

This directory is generated from the standalone repository's root-level
`native/` package by `scripts/sync-native.sh`.

The root `native/` package is the source of truth in the standalone
FileProviderProgress repository. In Raycast's extensions monorepo, this
directory is the bundled Swift source used to build the included
`assets/bin/fp-progress` helper.
EOF

printf "Synced native source into %s\n" "$BUNDLED_NATIVE_DIR"
