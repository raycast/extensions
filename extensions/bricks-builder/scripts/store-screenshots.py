# Turns plain screenshots of the Raycast window into Raycast Store screenshots: each one is centered
# on the same 2000×1250 background (16:10 PNG, as the Store requires) and saved to metadata/.
#
#   python3 scripts/store-screenshots.py ~/Desktop/raycast-shots/*.png
#
# Take the window shots with CleanShot (window capture, shadow and background off) or with ⌘⇧4,
# Space, then ⌥-click the Raycast window. Files are numbered in the order given, so name or pass
# them in the order they should appear in the Store. Needs Pillow (python3 -m pip install pillow).
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

WIDTH, HEIGHT = 2000, 1250
# The window may fill at most this much of the canvas, so every shot keeps the same margin.
MAX_W, MAX_H = 1680, 1050
OUT = Path(__file__).resolve().parent.parent / "metadata"
PREFIX = "bricks-builder"


def background() -> Image.Image:
    """A soft diagonal gradient from Bricks yellow to warm amber: high contrast for both themes."""
    top, bottom = (255, 222, 89), (255, 170, 64)
    gradient = Image.new("RGB", (WIDTH, HEIGHT))
    draw = ImageDraw.Draw(gradient)
    for y in range(HEIGHT):
        t = y / (HEIGHT - 1)
        draw.line([(0, y), (WIDTH, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(top, bottom)))
    return gradient


def compose(shot: Image.Image, canvas: Image.Image) -> Image.Image:
    shot = shot.convert("RGBA")
    scale = min(MAX_W / shot.width, MAX_H / shot.height, 1.0)
    if scale < 1:
        shot = shot.resize((round(shot.width * scale), round(shot.height * scale)), Image.LANCZOS)
    x, y = (WIDTH - shot.width) // 2, (HEIGHT - shot.height) // 2

    # A soft, offset shadow under the window.
    shadow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    alpha = shot.getchannel("A").point(lambda a: a * 0.35)
    shadow.paste((0, 0, 0, 255), (x, y + 18), alpha)
    shadow = shadow.filter(ImageFilter.GaussianBlur(28))

    result = canvas.convert("RGBA")
    result.alpha_composite(shadow)
    result.alpha_composite(shot, (x, y))
    return result.convert("RGB")


def main(paths: list[str]) -> None:
    if not paths:
        sys.exit(__doc__ or "Pass the window screenshots to convert.")
    if len(paths) > 6:
        sys.exit("The Store takes at most 6 screenshots.")
    OUT.mkdir(exist_ok=True)
    canvas = background()
    for old in OUT.glob(f"{PREFIX}-*.png"):
        old.unlink()
    for index, path in enumerate(paths, start=1):
        target = OUT / f"{PREFIX}-{index}.png"
        compose(Image.open(path), canvas).save(target, "PNG", optimize=True)
        print(f"{path} → {target.relative_to(OUT.parent)}")


if __name__ == "__main__":
    main(sys.argv[1:])
