#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BUILD_DIR="$(mktemp -d)"
trap 'rm -rf "$BUILD_DIR"' EXIT

SOURCE="$ROOT_DIR/native/WaitForComposer.swift"
OUTPUT="$ROOT_DIR/assets/wait-for-composer"
SDK_PATH="$(xcrun --sdk macosx --show-sdk-path)"

for ARCH in arm64 x86_64; do
  xcrun --sdk macosx swiftc -O \
    -target "$ARCH-apple-macos12.0" \
    -sdk "$SDK_PATH" \
    -module-cache-path "$BUILD_DIR/module-cache" \
    "$SOURCE" -o "$BUILD_DIR/wait-for-composer-$ARCH"
done

xcrun lipo -create \
  "$BUILD_DIR/wait-for-composer-arm64" \
  "$BUILD_DIR/wait-for-composer-x86_64" \
  -output "$OUTPUT"
chmod 755 "$OUTPUT"
codesign --force --sign - "$OUTPUT"
codesign --verify --strict "$OUTPUT"
for ARCH in arm64 x86_64; do
  xcrun lipo "$OUTPUT" -verify_arch "$ARCH"
done
shasum -a 256 "$OUTPUT"

node - "$SOURCE" "$OUTPUT" "$ROOT_DIR/native/build.json" <<'JS'
const fs = require("node:fs");
const { createHash } = require("node:crypto");
const [source, binary, output] = process.argv.slice(2);
const hash = (file) => createHash("sha256").update(fs.readFileSync(file)).digest("hex");
fs.writeFileSync(output, JSON.stringify({
  sourceSha256: hash(source),
  binarySha256: hash(binary),
  architectures: ["arm64", "x86_64"],
  deploymentTarget: "macOS 12.0",
}, null, 2) + "\n");
JS
