#!/usr/bin/env bash
set -euo pipefail

# Export SVG to PNG for Raycast extension icon.
# Usage: scripts/export-icon.sh [light|dark]

variant="${1:-light}"
src="assets/rocket-cloud.svg"
if [[ "$variant" == "dark" ]]; then
  src="assets/rocket-cloud-dark.svg"
fi

out="assets/extension-icon.png"

echo "Exporting $src -> $out (1024x1024)"

if command -v rsvg-convert >/dev/null 2>&1; then
  rsvg-convert -w 1024 -h 1024 "$src" -o "$out"
  echo "Done via rsvg-convert"
  exit 0
fi

if command -v inkscape >/dev/null 2>&1; then
  inkscape "$src" --export-type=png --export-filename="$out" -w 1024 -h 1024 >/dev/null 2>&1
  echo "Done via Inkscape"
  exit 0
fi

if command -v qlmanage >/dev/null 2>&1; then
  # macOS QuickLook thumbnail export
  qlmanage -t -s 1024 -o assets "$src" >/dev/null 2>&1 || true
  if [[ -f "assets/$(basename "$src").png" ]]; then
    mv "assets/$(basename "$src").png" "$out"
    echo "Done via qlmanage"
    exit 0
  fi
fi

cat << EOF
Could not find a converter (rsvg-convert, inkscape, or qlmanage).

Options:
1) Open $src in Preview and export as PNG 1024x1024 to $out
2) Install librsvg:   brew install librsvg   # then re-run this script
3) Install Inkscape:  brew install --cask inkscape
EOF
exit 1

