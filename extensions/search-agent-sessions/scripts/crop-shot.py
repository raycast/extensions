#!/usr/bin/env python3
"""Crop a Raycast screenshot to the 2000x1250 store size, centred on the window.

Finds the window as the region whose fill differs from the surrounding backdrop (it may be
darker or lighter than the backdrop, depending on how the shot was taken), scales it to the
frame width used by the existing metadata shots, and places it where they place it.
"""

import sys
from PIL import Image

OUT_W, OUT_H = 2000, 1250
REF_FRAME_W = 1560  # window frame width in the existing metadata shots
REF_CENTRE = (999.5, 624.5)  # where that frame sits in their 2000x1250 canvas


def window_frame(img: Image.Image) -> tuple[int, int, int, int]:
    """The main window's rect, probed low enough to miss any open popover."""
    grey = img.convert("L")
    w, h = grey.size
    px = grey.load()
    bg = px[3, 3]
    differs = lambda x, y: abs(px[x, y] - bg) > 8

    rows = [y for y in range(0, h, 4) if any(differs(x, y) for x in range(0, w, 4))]
    if not rows:
        sys.exit("Could not find the window — is the backdrop plain?")
    # 90% down the UI: inside the window body, below the popover.
    y = rows[0] + int((rows[-1] - rows[0]) * 0.9)

    xs = [x for x in range(w) if differs(x, y)]
    x0, x1 = xs[0], xs[-1]
    col = (x0 + x1) // 2
    ys = [yy for yy in range(h) if differs(col, yy)]
    return x0, ys[0], x1, ys[-1]


def main(src: str, dst: str, rescale: bool) -> None:
    img = Image.open(src).convert("RGB")
    frame = window_frame(img)

    scale = REF_FRAME_W / (frame[2] - frame[0] + 1)
    if rescale and abs(scale - 1) > 0.005:
        img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
        frame = tuple(round(v * scale) for v in frame)
    else:
        scale = 1.0

    cx, cy = (frame[0] + frame[2]) / 2, (frame[1] + frame[3]) / 2
    # Pad with the backdrop colour so a window near an edge still yields a full frame.
    canvas = Image.new("RGB", (OUT_W, OUT_H), img.getpixel((1, 1)))
    canvas.paste(img, (round(REF_CENTRE[0] - cx), round(REF_CENTRE[1] - cy)))
    canvas.save(dst)
    print(f"{dst}  frame {frame}  width {frame[2] - frame[0] + 1}  scale {scale:.3f}")


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 2:
        sys.exit("usage: crop-shot.py [--native] <source.png> <dest.png>")
    main(args[0], args[1], rescale="--native" not in sys.argv)
