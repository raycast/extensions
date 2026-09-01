#!/usr/bin/env python3
"""Generate the GHBar icons.

    python3 tools/makeicon.py

Output:
    assets/extension-icon.png   512x512, dark rounded square + green glyph
    assets/menubar-icon.png      64x64, transparent + white glyph

Not part of the build — run it by hand when the icon changes. Keeping the
generator instead of a committed binary makes colors and proportions
adjustable later.

The glyph is a pull request: two rings joined by a vertical line on the left,
a third ring on the right whose line curves back into the trunk.

Drawing uses a signed distance field: each pixel measures its distance to the
shape and the edge gets a smooth falloff, so antialiasing comes for free.
Filling pixel by pixel would leave jagged edges.
"""

import math
import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

# --- Glyph layout, in a 0..1 unit square ------------------------------------
# The right column and the arc radius derive from one value, so the arc starts
# exactly at the foot of the right line and ends on the left line.
LEFT_X = 0.40
ARC_R = 0.26
RIGHT_X = LEFT_X + ARC_R
TOP_Y = 0.20
BOTTOM_Y = 0.80
ARC_CY = 0.46

RING_R = 0.078
STROKE = 0.062


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _dist_segment(px: float, py: float, ax: float, ay: float, bx: float, by: float) -> float:
    """Distance from a point to a line segment."""
    dx, dy = bx - ax, by - ay
    length_squared = dx * dx + dy * dy
    t = 0.0 if length_squared == 0 else _clamp(((px - ax) * dx + (py - ay) * dy) / length_squared, 0.0, 1.0)
    return math.hypot(px - (ax + t * dx), py - (ay + t * dy))


def _dist_ring(px: float, py: float, cx: float, cy: float, radius: float) -> float:
    """Distance to a circle outline, not a filled disc."""
    return abs(math.hypot(px - cx, py - cy) - radius)


def _dist_arc(px: float, py: float, cx: float, cy: float, radius: float, start: float, end: float) -> float:
    """Distance to an arc; outside the angular range it falls back to the endpoints."""
    angle = math.atan2(py - cy, px - cx)
    if angle < 0:
        angle += 2 * math.pi
    if start <= angle <= end:
        return abs(math.hypot(px - cx, py - cy) - radius)
    return min(
        math.hypot(px - (cx + radius * math.cos(a)), py - (cy + radius * math.sin(a))) for a in (start, end)
    )


def glyph_distance(x: float, y: float) -> float:
    """Shortest distance to the glyph's centerline."""
    return min(
        _dist_segment(x, y, LEFT_X, TOP_Y + RING_R, LEFT_X, BOTTOM_Y - RING_R),
        _dist_ring(x, y, LEFT_X, TOP_Y, RING_R),
        _dist_ring(x, y, LEFT_X, BOTTOM_Y, RING_R),
        _dist_ring(x, y, RIGHT_X, TOP_Y, RING_R),
        _dist_segment(x, y, RIGHT_X, TOP_Y + RING_R, RIGHT_X, ARC_CY),
        _dist_arc(x, y, LEFT_X, ARC_CY, ARC_R, 0.0, math.pi / 2),
    )


def coverage(x: float, y: float, softness: float) -> float:
    """How much of the pixel the glyph covers (0..1)."""
    edge = STROKE / 2
    d = glyph_distance(x, y)
    if d <= edge - softness:
        return 1.0
    if d >= edge + softness:
        return 0.0
    t = (edge + softness - d) / (2 * softness)
    return t * t * (3 - 2 * t)  # smoothstep


def rounded_square_coverage(x: float, y: float, radius: float, softness: float) -> float:
    """The rounded-square macOS icon silhouette."""
    ax, ay = abs(x - 0.5), abs(y - 0.5)
    half = 0.5 - radius
    dx, dy = max(ax - half, 0.0), max(ay - half, 0.0)
    d = math.hypot(dx, dy) - radius
    if d <= -softness:
        return 1.0
    if d >= softness:
        return 0.0
    t = (softness - d) / (2 * softness)
    return t * t * (3 - 2 * t)


def _png(width: int, height: int, pixels: bytes) -> bytes:
    """Wrap an RGBA buffer in a PNG container."""
    raw = b"".join(b"\x00" + pixels[y * width * 4 : (y + 1) * width * 4] for y in range(height))

    def chunk(tag: bytes, data: bytes) -> bytes:
        return (
            struct.pack(">I", len(data))
            + tag
            + data
            + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)
        )

    return (
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(raw, 9))
        + chunk(b"IEND", b"")
    )


def _blend(bottom: tuple[int, int, int, int], top: tuple[int, int, int], alpha: float) -> tuple[int, int, int, int]:
    br, bg, bb, ba = bottom
    a = alpha + ba / 255 * (1 - alpha)
    if a == 0:
        return (0, 0, 0, 0)
    out = tuple(int(round((c * alpha + bc * (ba / 255) * (1 - alpha)) / a)) for c, bc in zip(top, (br, bg, bb)))
    return (out[0], out[1], out[2], int(round(a * 255)))


def extension_icon(size: int = 512) -> bytes:
    """Dark rounded square with the glyph in green."""
    background = (0x16, 0x1B, 0x22)
    accent = (0x2E, 0xB8, 0x57)
    softness = 1.2 / size
    inset = 0.14  # breathing room between glyph and edge

    buffer = bytearray()
    for py in range(size):
        for px in range(size):
            x, y = (px + 0.5) / size, (py + 0.5) / size
            pixel = _blend((0, 0, 0, 0), background, rounded_square_coverage(x, y, 0.22, softness))
            gx = (x - inset) / (1 - 2 * inset)
            gy = (y - inset) / (1 - 2 * inset)
            if 0 <= gx <= 1 and 0 <= gy <= 1:
                pixel = _blend(pixel, accent, coverage(gx, gy, softness / (1 - 2 * inset)))
            buffer += bytes(pixel)
    return _png(size, size, bytes(buffer))


def menubar_icon(size: int = 64) -> bytes:
    """Transparent background, white glyph. Raycast tints it per theme."""
    softness = 1.2 / size
    buffer = bytearray()
    for py in range(size):
        for px in range(size):
            x, y = (px + 0.5) / size, (py + 0.5) / size
            buffer += bytes((255, 255, 255, int(round(coverage(x, y, softness) * 255))))
    return _png(size, size, bytes(buffer))


def main() -> None:
    ASSETS.mkdir(exist_ok=True)
    for name, data in (("extension-icon.png", extension_icon()), ("menubar-icon.png", menubar_icon())):
        path = ASSETS / name
        path.write_bytes(data)
        print(f"{path.relative_to(ROOT)}  {len(data):,} bytes")


if __name__ == "__main__":
    main()
