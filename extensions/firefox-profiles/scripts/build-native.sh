#!/bin/bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SOURCE="$ROOT/native/firefox-window-helper.swift"
OUTPUT="$ROOT/assets/firefox-window-helper"
ARM64="${TMPDIR:-/tmp}/firefox-window-helper-arm64"
X86_64="${TMPDIR:-/tmp}/firefox-window-helper-x86_64"

xcrun swiftc -O -target arm64-apple-macosx12.0 "$SOURCE" -o "$ARM64"
xcrun swiftc -O -target x86_64-apple-macosx12.0 "$SOURCE" -o "$X86_64"
lipo -create "$ARM64" "$X86_64" -output "$OUTPUT"
chmod +x "$OUTPUT"
