#!/bin/bash
# Builds helper/*.swift into assets/digup-helper (arm64, macOS 14+) with the Command Line Tools' swiftc.
# Usage: scripts/build-helper.sh [output path]
set -euo pipefail
cd "$(dirname "$0")/.."
OUT="${1:-assets/digup-helper}"
mkdir -p "$(dirname "$OUT")"

# Swift 5 language mode: the ported readers use DigUp's detached-task and Foundation patterns, which Swift 6's strict
# concurrency checks reject.
/usr/bin/swiftc -O -swift-version 5 \
  -target arm64-apple-macos14.0 -sdk "$(xcrun --show-sdk-path)" \
  -module-name digup_helper \
  -framework AppKit -framework PDFKit -framework Vision -framework AVFoundation -framework ImageIO \
  -framework UniformTypeIdentifiers -framework IOKit -framework QuickLookThumbnailing -framework CoreMedia \
  helper/*.swift -o "$OUT"

# The linker already signs arm64 binaries ad hoc; sign again so a moved or copied binary stays valid.
/usr/bin/codesign --force --sign - "$OUT" 2>/dev/null || true
echo "built $OUT"
