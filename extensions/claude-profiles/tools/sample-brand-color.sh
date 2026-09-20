#!/usr/bin/env bash
# sample-brand-color.sh: finds the most common opaque non-white color in an
# app icon. .icns input needs sips, macOS only; pass a PNG directly on Linux.
set -euo pipefail

SRC="${1:-/Applications/Claude.app/Contents/Resources/electron.icns}"
TMP="${TMPDIR:-/tmp}/brand_sample.png"

case "$SRC" in
  *.icns)
    command -v sips >/dev/null 2>&1 || {
      echo "error: .icns input needs sips (macOS). Pass a .png instead." >&2
      exit 1
    }
    sips -s format png -z 256 256 "$SRC" --out "$TMP" >/dev/null
    IMG="$TMP"
    ;;
  *)
    IMG="$SRC"
    ;;
esac

python3 - "$IMG" <<'PY'
from collections import Counter
import struct, zlib, sys

data = open(sys.argv[1], 'rb').read()
pos, idat, w, h, ctype = 8, b'', None, None, None
while pos < len(data):
    ln = struct.unpack('>I', data[pos:pos + 4])[0]
    typ = data[pos + 4:pos + 8]
    body = data[pos + 8:pos + 8 + ln]
    if typ == b'IHDR':
        w, h, _depth, ctype = struct.unpack('>IIBB', body[:10])
    elif typ == b'IDAT':
        idat += body
    pos += 12 + ln

nch = {0: 1, 2: 3, 4: 2, 6: 4}[ctype]
raw = zlib.decompress(idat)
stride = w * nch
prev = bytearray(stride)
counts = Counter()
o = 0
for _ in range(h):
    ft = raw[o]; o += 1
    line = bytearray(raw[o:o + stride]); o += stride
    for i in range(stride):
        a = line[i - nch] if i >= nch else 0
        b = prev[i]
        c = prev[i - nch] if i >= nch else 0
        if ft == 1:   line[i] = (line[i] + a) & 255
        elif ft == 2: line[i] = (line[i] + b) & 255
        elif ft == 3: line[i] = (line[i] + (a + b) // 2) & 255
        elif ft == 4:
            p = a + b - c
            pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
            line[i] = (line[i] + (a if (pa <= pb and pa <= pc) else (b if pb <= pc else c))) & 255
    for x in range(w):
        px = line[x * nch:(x + 1) * nch]
        r, g, bl = px[0], px[1], px[2] if nch >= 3 else (px[0], px[0], px[0])[2]
        alpha = px[3] if nch == 4 else 255
        if alpha > 200 and not (r > 240 and g > 240 and bl > 240):
            counts[(r, g, bl)] += 1
    prev = line

total = sum(counts.values()) or 1
print(f'{"HEX":10} {"PIXELS":>8} {"SHARE":>7}')
for (r, g, bl), n in counts.most_common(6):
    print(f'#{r:02X}{g:02X}{bl:02X}   {n:>8} {n / total * 100:>6.1f}%')
print('\nThe top entry is the flat brand fill; the rest are antialiasing.')
PY
