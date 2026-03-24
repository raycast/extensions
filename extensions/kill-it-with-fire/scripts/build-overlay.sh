#!/usr/bin/env bash
# ============================================================
# build-overlay.sh — Compile the native macOS overlay binary
#
# Compiles swift/overlay.swift into assets/overlay using swiftc.
# This runs automatically via the npm postinstall hook so that
# `npm install` produces a ready-to-use binary.
#
# Usage:
#   bash scripts/build-overlay.sh      (from project root)
#   npm run build-overlay              (via package.json script)
#
# Output:
#   assets/overlay   — Mach-O executable (arm64 / x86_64)
#
# Prerequisites:
#   Xcode Command Line Tools (xcode-select --install)
# ============================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SWIFT_SRC="$ROOT/swift/overlay.swift"
OUTPUT="$ROOT/assets/overlay"

echo "→ Compiling overlay helper (universal binary)…"
swiftc "$SWIFT_SRC" \
  -o "${OUTPUT}_arm64" \
  -O \
  -target arm64-apple-macos12 \
  -framework Cocoa \
  -framework WebKit

swiftc "$SWIFT_SRC" \
  -o "${OUTPUT}_x86_64" \
  -O \
  -target x86_64-apple-macos12 \
  -framework Cocoa \
  -framework WebKit

lipo -create -output "$OUTPUT" "${OUTPUT}_arm64" "${OUTPUT}_x86_64"
rm -f "${OUTPUT}_arm64" "${OUTPUT}_x86_64"

chmod +x "$OUTPUT"
echo "✓ Built universal binary: $OUTPUT"
