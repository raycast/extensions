#!/usr/bin/env bash
# make-icon.sh: renders assets/icon.png from swap_icon.svg, cropping the
# Noun Project attribution strip and tinting shapes with BRAND.
set -euo pipefail

BRAND="${BRAND:-#D97757}"

cd "$(dirname "$0")/.."
mkdir -p assets .tmp

command -v rsvg-convert >/dev/null 2>&1 || {
  echo "error: rsvg-convert not found (brew install librsvg / apt install librsvg2-bin)" >&2
  exit 1
}

crop='s{<text.*?</text>}{}s; s{viewBox="0 0 100 125"}{viewBox="0 0 100 100"}'
tint="s{<defs\\s+id=\"defs3\"\\s*/>}{<defs><style>*{fill:$BRAND}</style></defs>}"

perl -0777 -pe "$crop; $tint" swap_icon.svg > .tmp/icon.svg
rsvg-convert -w 512 -h 512 .tmp/icon.svg -o assets/icon.png

# reads the IHDR chunk directly, no Pillow or ImageMagick dependency
python3 - assets/icon.png "$BRAND" <<'PY'
import os, struct, sys

path, brand = sys.argv[1], sys.argv[2]
with open(path, 'rb') as fh:
    width, height = struct.unpack('>II', fh.read(24)[16:24])
print(f'{path}  {width}x{height}  {os.path.getsize(path)} bytes  fill {brand}')
PY
