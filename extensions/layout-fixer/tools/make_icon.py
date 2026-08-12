#!/usr/bin/env python3
"""Generate the Raycast extension icon — no third-party dependencies.

Two opposed arrows (a "swap") on an indigo rounded square, drawn supersampled
and box-filtered so the diagonals stay smooth. Reads the same as the Chrome
version of Layout Fixer, and holds up on both light and dark Raycast themes.

    python3 tools/make_icon.py
"""

import os
import struct
import zlib

SIZE = 512  # Raycast requires 512x512
SS = 3      # supersampling factor
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")

TOP = (0x63, 0x66, 0xF1)     # #6366f1
BOTTOM = (0x43, 0x38, 0xCA)  # #4338ca
INK = (0xFF, 0xFF, 0xFF)

# Geometry in a 128x128 design space, scaled up at render time.
RADIUS = 28
BAR = 13.0
HEAD = 19.0
Y_TOP, Y_BOTTOM = 47.0, 81.0
SHAFT_L, SHAFT_R = 26.0, 102.0
TIP_R, TIP_L = 106.0, 22.0
HEAD_LEN = 22.0


def in_rounded_square(x, y):
    if RADIUS <= x <= 128 - RADIUS or RADIUS <= y <= 128 - RADIUS:
        return 0 <= x <= 128 and 0 <= y <= 128
    cx = RADIUS if x < RADIUS else 128 - RADIUS
    cy = RADIUS if y < RADIUS else 128 - RADIUS
    return (x - cx) ** 2 + (y - cy) ** 2 <= RADIUS**2


def in_arrow(x, y, cy, tip_x, back_x, shaft_start, shaft_end):
    """One arrow: a shaft rectangle plus a triangular head."""
    if abs(y - cy) <= BAR / 2 and min(shaft_start, shaft_end) <= x <= max(shaft_start, shaft_end):
        return True
    span = tip_x - back_x
    t = (x - back_x) / span
    if 0 <= t <= 1:
        return abs(y - cy) <= HEAD * (1 - t)
    return False


def in_ink(x, y):
    # Top arrow points right, bottom arrow points left.
    if in_arrow(x, y, Y_TOP, TIP_R, TIP_R - HEAD_LEN, SHAFT_L, TIP_R - HEAD_LEN + 2):
        return True
    if in_arrow(x, y, Y_BOTTOM, TIP_L, TIP_L + HEAD_LEN, SHAFT_R, TIP_L + HEAD_LEN - 2):
        return True
    return False


def render(size):
    scale = 128.0 / (size * SS)
    n = float(SS * SS)
    rows = []
    for py in range(size):
        row = bytearray()
        # Vertical gradient for the plate, constant across the row.
        t = (py + 0.5) / size
        plate = tuple(TOP[i] + (BOTTOM[i] - TOP[i]) * t for i in range(3))
        ys = [(py * SS + sy + 0.5) * scale for sy in range(SS)]
        for px in range(size):
            xs = [(px * SS + sx + 0.5) * scale for sx in range(SS)]
            bg = 0.0
            ink = 0.0
            for y in ys:
                for x in xs:
                    if in_rounded_square(x, y):
                        bg += 1.0
                        if in_ink(x, y):
                            ink += 1.0
            if bg == 0:
                row += bytes((0, 0, 0, 0))
                continue
            k = ink / bg
            rgb = tuple(int(round(plate[i] + (INK[i] - plate[i]) * k)) for i in range(3))
            row += bytes((rgb[0], rgb[1], rgb[2], int(round(bg / n * 255))))
        rows.append(bytes(row))
    return rows


def write_png(path, size, rows):
    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body))

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)


def main():
    os.makedirs(OUT, exist_ok=True)
    path = os.path.join(OUT, "extension-icon.png")
    write_png(path, SIZE, render(SIZE))
    print("wrote %s (%d KB)" % (path, os.path.getsize(path) // 1024))


if __name__ == "__main__":
    main()
