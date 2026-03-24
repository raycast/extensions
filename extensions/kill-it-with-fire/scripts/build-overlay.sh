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

echo "→ Compiling overlay helper…"
swiftc "$SWIFT_SRC" \
  -o "$OUTPUT" \
  -O \
  -framework Cocoa \
  -framework WebKit

chmod +x "$OUTPUT"
echo "✓ Built $OUTPUT"
