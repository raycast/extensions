#!/bin/bash
#  generate-icons.sh
#  ─────────────────
#  Convert SVG icons to PNG for the Raycast extension.
#  Requires one of: rsvg-convert (brew install librsvg)
#                   or python3 + Pillow (pip3 install Pillow)
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR"

echo "🎨  Generating Raycast icons..."

if command -v rsvg-convert &>/dev/null; then
    echo "  using rsvg-convert"
    for svg in "$ASSETS_DIR"/*.svg; do
        name="$(basename "$svg" .svg)"
        rsvg-convert -w 512 -h 512 "$svg" -o "$ASSETS_DIR/${name}.png"
        echo "    ✓ ${name}.png"
    done
elif python3 -c "from PIL import Image" 2>/dev/null; then
    echo "  using python3 + Pillow + cairosvg"
    python3 -c "
import os
import cairosvg
assets = '$ASSETS_DIR'
for f in os.listdir(assets):
    if f.endswith('.svg'):
        svg_path = os.path.join(assets, f)
        png_path = os.path.join(assets, f.replace('.svg', '.png'))
        cairosvg.svg2png(url=svg_path, write_to=png_path, output_width=512, output_height=512)
        print(f'    ✓ {os.path.basename(png_path)}')
" 2>/dev/null || {
        echo "  ⚠️  cairosvg not available. Install it: pip3 install cairosvg Pillow"
        echo "  or install rsvg-convert: brew install librsvg"
        exit 1
    }
else
    echo "  ⚠️  No SVG→PNG converter found."
    echo "  Install one of:"
    echo "    brew install librsvg          (provides rsvg-convert)"
    echo "    pip3 install cairosvg Pillow  (Python SVG renderer)"
    exit 1
fi

echo ""
echo "✅  Done!  PNG icons generated in $ASSETS_DIR"
