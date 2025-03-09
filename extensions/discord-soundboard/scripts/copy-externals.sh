#!/bin/bash

SRC_DIR="node_modules"
EXTENSIONS_DIR="$HOME/.config/raycast/extensions"

PACKAGES=(
  "level"
  "classic-level"
  "abstract-level"
  "level-supports"
  "level-transcoder"
  "module-error"
  "maybe-combine-errors"
  "node-gyp-build"
)

EXTENSION_DIR=$(find "$EXTENSIONS_DIR" -type d -name "*" -exec bash -c 'if [ -f "{}/package.json" ]; then grep -l "discord-soundboard" "{}/package.json" >/dev/null && echo "{}"; fi' \;)

if [ -z "$EXTENSION_DIR" ]; then
  echo "Error: Could not find discord-soundboard extension directory. run 'npm run dev' again."
  exit 0
fi

DEST_DIR="$EXTENSION_DIR/node_modules"
mkdir -p "$DEST_DIR"

for PACKAGE in "${PACKAGES[@]}"; do
  if [ -d "$SRC_DIR/$PACKAGE" ]; then
    cp -R "$SRC_DIR/$PACKAGE" "$DEST_DIR/"
  else
    echo "Warning: Package $PACKAGE not found in $SRC_DIR"
  fi
done

echo "External dependencies copied successfully!"
