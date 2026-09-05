#!/usr/bin/env python3
"""Bring Store screenshots to the 2000x1250 spec.

    python3 tools/makeshot.py crop  <input> <output> <x> <y> <width>
    python3 tools/makeshot.py place <background> <window> <output> [--top N]

`crop`  cuts a 16:10 region and scales it to 2000x1250.
`place` composites a transparent-background window shot onto a background.

Why hand-rolled PNG work: `sips` can only crop from the CENTER and cannot
composite at all, and the menu-bar dropdown sits in the top right. PIL is not
installed, and adding a dependency for a one-off job is disproportionate.

Scaling is still left to `sips` — writing a resampler by hand is needless
risk. Compositing happens pixel by pixel but always at FULL resolution; the
downscale is a single step at the end.

Every screenshot must share the same background (a Store rule), so `place`
takes the background from outside: a clean desktop capture.
"""

import struct
import subprocess
import sys
import zlib
from pathlib import Path

TARGET_WIDTH = 2000
TARGET_HEIGHT = 1250
ASPECT = TARGET_WIDTH / TARGET_HEIGHT  # 1.6


class Image:
    """An 8-bit RGBA pixel buffer."""

    def __init__(self, width: int, height: int, pixels: bytearray):
        self.width = width
        self.height = height
        self.pixels = pixels  # width * height * 4

    def at(self, x: int, y: int) -> int:
        return (y * self.width + x) * 4


def decode_png(path: Path) -> Image:
    data = path.read_bytes()
    if data[:8] != b"\x89PNG\r\n\x1a\n":
        raise SystemExit(f"{path}: not a PNG")

    pos = 8
    width = height = 0
    bit_depth = color_type = 0
    idat = bytearray()
    while pos < len(data):
        (length,) = struct.unpack(">I", data[pos : pos + 4])
        tag = data[pos + 4 : pos + 8]
        body = data[pos + 8 : pos + 8 + length]
        if tag == b"IHDR":
            width, height, bit_depth, color_type = struct.unpack(">IIBB", body[:10])[:4]
            interlace = body[12]
            if bit_depth != 8 or color_type not in (2, 6) or interlace != 0:
                raise SystemExit(f"{path}: only 8-bit RGB/RGBA, non-interlaced is supported")
        elif tag == b"IDAT":
            idat += body
        elif tag == b"IEND":
            break
        pos += 12 + length

    channels = 3 if color_type == 2 else 4
    stride = width * channels
    raw = zlib.decompress(bytes(idat))

    # Undo the PNG row filters (spec section 9.2)
    out = bytearray(width * height * 4)
    previous = bytearray(stride)
    offset = 0
    for y in range(height):
        filter_type = raw[offset]
        offset += 1
        line = bytearray(raw[offset : offset + stride])
        offset += stride

        for i in range(stride):
            a = line[i - channels] if i >= channels else 0
            b = previous[i]
            c = previous[i - channels] if i >= channels else 0
            if filter_type == 1:
                line[i] = (line[i] + a) & 0xFF
            elif filter_type == 2:
                line[i] = (line[i] + b) & 0xFF
            elif filter_type == 3:
                line[i] = (line[i] + (a + b) // 2) & 0xFF
            elif filter_type == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                pred = a if (pa <= pb and pa <= pc) else (b if pb <= pc else c)
                line[i] = (line[i] + pred) & 0xFF
        previous = line

        base = y * width * 4
        if channels == 4:
            out[base : base + width * 4] = line
        else:
            for x in range(width):
                out[base + x * 4 : base + x * 4 + 3] = line[x * 3 : x * 3 + 3]
                out[base + x * 4 + 3] = 255

    return Image(width, height, out)


def encode_png(image: Image, path: Path) -> None:
    stride = image.width * 4
    raw = b"".join(
        b"\x00" + bytes(image.pixels[y * stride : (y + 1) * stride]) for y in range(image.height)
    )

    def chunk(tag: bytes, body: bytes) -> bytes:
        return struct.pack(">I", len(body)) + tag + body + struct.pack(">I", zlib.crc32(tag + body) & 0xFFFFFFFF)

    path.write_bytes(
        b"\x89PNG\r\n\x1a\n"
        + chunk(b"IHDR", struct.pack(">IIBBBBB", image.width, image.height, 8, 6, 0, 0, 0))
        + chunk(b"IDAT", zlib.compress(bytes(raw), 6))
        + chunk(b"IEND", b"")
    )


def crop(image: Image, x: int, y: int, width: int, height: int) -> Image:
    x = max(0, min(x, image.width - 1))
    y = max(0, min(y, image.height - 1))
    width = min(width, image.width - x)
    height = min(height, image.height - y)

    out = bytearray(width * height * 4)
    for row in range(height):
        source = image.at(x, y + row)
        out[row * width * 4 : (row + 1) * width * 4] = image.pixels[source : source + width * 4]
    return Image(width, height, out)


def composite(background: Image, foreground: Image, x: int, y: int) -> Image:
    """Alpha-composites onto the background, which is modified in place."""
    for row in range(foreground.height):
        target_y = y + row
        if not (0 <= target_y < background.height):
            continue
        for column in range(foreground.width):
            target_x = x + column
            if not (0 <= target_x < background.width):
                continue
            f = foreground.at(column, row)
            alpha = foreground.pixels[f + 3]
            if alpha == 0:
                continue
            b = background.at(target_x, target_y)
            if alpha == 255:
                background.pixels[b : b + 4] = foreground.pixels[f : f + 4]
                continue
            for channel in range(3):
                src = foreground.pixels[f + channel]
                dst = background.pixels[b + channel]
                background.pixels[b + channel] = (src * alpha + dst * (255 - alpha)) // 255
            background.pixels[b + 3] = 255
    return background


def resize_to_spec(path: Path) -> None:
    """Final step: scale to 2000x1250. Resampling is `sips`'s job."""
    subprocess.run(
        ["sips", "-z", str(TARGET_HEIGHT), str(TARGET_WIDTH), str(path), "--out", str(path)],
        check=True,
        capture_output=True,
    )


def fit_aspect(width: int) -> int:
    """The 16:10 height for a given width."""
    return round(width / ASPECT)


def main() -> None:
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)

    command = sys.argv[1]

    if command == "crop":
        source, destination, x, y, width = sys.argv[2:7]
        image = decode_png(Path(source))
        width = int(width)
        out = crop(image, int(x), int(y), width, fit_aspect(width))
        encode_png(out, Path(destination))
        resize_to_spec(Path(destination))
        print(f"{destination}  {TARGET_WIDTH}x{TARGET_HEIGHT}")

    elif command == "place":
        background_path, window_path, destination = sys.argv[2:5]
        top = 0.5
        if "--top" in sys.argv:
            top = float(sys.argv[sys.argv.index("--top") + 1])

        background = decode_png(Path(background_path))
        window = decode_png(Path(window_path))

        # A 16:10 region of the background, with the window centered.
        height = fit_aspect(background.width)
        canvas = crop(background, 0, max(0, (background.height - height) // 2), background.width, height)

        x = (canvas.width - window.width) // 2
        y = round((canvas.height - window.height) * top)
        composite(canvas, window, x, y)

        encode_png(canvas, Path(destination))
        resize_to_spec(Path(destination))
        print(f"{destination}  {TARGET_WIDTH}x{TARGET_HEIGHT}")

    else:
        raise SystemExit(__doc__)


if __name__ == "__main__":
    main()
