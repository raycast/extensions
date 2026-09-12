#!/usr/bin/env bash
# Renders the extension icon from its SVG source into assets/icon.png.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SOURCE_SVG="${SCRIPT_DIR}/icon.svg"
OUTPUT_PNG="${SCRIPT_DIR}/../assets/icon.png"
ICON_SIZE=512

if ! command -v rsvg-convert >/dev/null 2>&1; then
  echo "error: rsvg-convert not found. Install it with: brew install librsvg" >&2
  exit 1
fi

rsvg-convert -w "${ICON_SIZE}" -h "${ICON_SIZE}" "${SOURCE_SVG}" -o "${OUTPUT_PNG}"
echo "wrote ${OUTPUT_PNG} (${ICON_SIZE}x${ICON_SIZE})"
