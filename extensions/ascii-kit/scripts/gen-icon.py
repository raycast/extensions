"""Draws assets/icon.png: a tree glyph (├── └──) on a rounded dark tile. Stdlib only."""
import struct, zlib, pathlib

S = 512
BG, FG, ACC = (24, 26, 32), (236, 238, 242), (255, 170, 60)
px = [[None] * S for _ in range(S)]

def inside_rounded(x, y, r=110):
    cx = min(max(x, r), S - 1 - r); cy = min(max(y, r), S - 1 - r)
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r

def rect(x0, y0, x1, y1, c):
    for y in range(y0, y1):
        for x in range(x0, x1):
            px[y][x] = c

for y in range(S):
    for x in range(S):
        if inside_rounded(x, y):
            px[y][x] = BG

t = 30  # stroke
rect(136, 110, 136 + t, 390, FG)          # trunk
rect(136, 220, 300, 220 + t, FG)          # ├──
rect(136, 360, 300, 360 + t, FG)          # └──
rect(330, 205, 390, 265, ACC)             # node
rect(330, 345, 390, 405, FG)              # node
rect(120, 90, 182, 130, FG)               # root cap

raw = b"".join(
    b"\x00" + b"".join(bytes((*c, 255)) if c else b"\x00\x00\x00\x00" for c in row) for row in px
)
def chunk(tag, data):
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", S, S, 8, 6, 0, 0, 0)) \
    + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
out = pathlib.Path(__file__).resolve().parent.parent / "assets" / "icon.png"
out.write_bytes(png)
print(f"Wrote {out}")
