"""Puts a Raycast window capture on a consistent 2000x1250 background, as the Raycast Store expects.

Usage: python3 scripts/store-screenshot.py <capture.png> <metadata/name.png>
"""
import sys
from PIL import Image, ImageChops, ImageDraw, ImageFilter

W, H = 2000, 1250
TOP, BOTTOM = (124, 92, 255), (52, 30, 128)  # Proton-like purple gradient
WINDOW_WIDTH = 1700
CORNER_RADIUS = 36


def background() -> Image.Image:
    bg = Image.new("RGB", (W, H))
    draw = ImageDraw.Draw(bg)
    for y in range(H):
        t = y / (H - 1)
        draw.line([(0, y), (W, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(TOP, BOTTOM)))
    return bg.convert("RGBA")


def main(src: str, dst: str) -> None:
    window = Image.open(src).convert("RGBA")
    scale = WINDOW_WIDTH / window.width
    window = window.resize((WINDOW_WIDTH, round(window.height * scale)), Image.LANCZOS)
    # Captures are often cropped tighter than the window: round all four corners like Raycast's.
    corners = Image.new("L", window.size, 0)
    ImageDraw.Draw(corners).rounded_rectangle([0, 0, window.width - 1, window.height - 1], radius=CORNER_RADIUS, fill=255)
    window.putalpha(ImageChops.multiply(window.split()[3], corners))
    x, y = (W - window.width) // 2, (H - window.height) // 2

    canvas = background()
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    mask = window.split()[3].point(lambda a: 110 if a > 0 else 0)
    shadow.paste((0, 0, 0, 255), (x, y + 18), mask)
    canvas = Image.alpha_composite(canvas, shadow.filter(ImageFilter.GaussianBlur(28)))
    canvas.alpha_composite(window, (x, y))
    canvas.convert("RGB").save(dst, "PNG")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
