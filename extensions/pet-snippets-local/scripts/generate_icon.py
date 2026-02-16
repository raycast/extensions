#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter

SIZE = 512
OUTPUT = Path(__file__).resolve().parent.parent / "assets" / "command-icon.png"


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def blend(c1: tuple[int, int, int], c2: tuple[int, int, int], t: float) -> tuple[int, int, int]:
    return (
        int(lerp(c1[0], c2[0], t)),
        int(lerp(c1[1], c2[1], t)),
        int(lerp(c1[2], c2[2], t)),
    )


def draw_background(canvas: Image.Image) -> None:
    draw = ImageDraw.Draw(canvas)
    c_top = (11, 20, 44)
    c_bottom = (8, 95, 94)
    for y in range(SIZE):
        t = y / (SIZE - 1)
        color = blend(c_top, c_bottom, t * 0.9)
        draw.line((0, y, SIZE, y), fill=color)

    # Soft cyan glow in the upper-right corner.
    glow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((240, -40, 620, 330), fill=(103, 232, 249, 95))
    gdraw.ellipse((300, 10, 590, 300), fill=(167, 243, 208, 60))
    canvas.alpha_composite(glow.filter(ImageFilter.GaussianBlur(36)))


def draw_card(canvas: Image.Image) -> tuple[int, int, int, int]:
    x0, y0, x1, y1 = 58, 58, SIZE - 58, SIZE - 58
    radius = 92

    shadow = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle((x0 + 10, y0 + 16, x1 + 10, y1 + 16), radius=radius, fill=(0, 0, 0, 130))
    canvas.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))

    card = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    cdraw = ImageDraw.Draw(card)
    cdraw.rounded_rectangle((x0, y0, x1, y1), radius=radius, fill=(14, 24, 48, 235), outline=(125, 211, 252, 130), width=4)

    # Subtle vertical sheen.
    for i in range(0, 220):
        alpha = max(0, 55 - i // 5)
        cdraw.rounded_rectangle((x0 + 4, y0 + 4 + i, x1 - 4, y0 + 4 + i + 1), radius=radius - 4, fill=(255, 255, 255, alpha))

    canvas.alpha_composite(card)
    return x0, y0, x1, y1


def draw_terminal_symbol(canvas: Image.Image, rect: tuple[int, int, int, int]) -> None:
    x0, y0, x1, y1 = rect
    draw = ImageDraw.Draw(canvas)

    win = (x0 + 56, y0 + 76, x1 - 56, y1 - 74)
    radius = 48
    draw.rounded_rectangle(win, radius=radius, fill=(6, 14, 28, 235), outline=(103, 232, 249, 95), width=3)

    # Terminal top bar + traffic lights.
    top_h = 58
    draw.rounded_rectangle((win[0], win[1], win[2], win[1] + top_h), radius=radius, fill=(16, 28, 52, 230))
    draw.rectangle((win[0], win[1] + top_h - 10, win[2], win[1] + top_h), fill=(16, 28, 52, 230))
    cx = win[0] + 30
    cy = win[1] + 29
    for color in ((251, 113, 133), (250, 204, 21), (74, 222, 128)):
        draw.ellipse((cx - 8, cy - 8, cx + 8, cy + 8), fill=color)
        cx += 24

    # </> glyph.
    code_color = (190, 242, 100)
    w = 13
    mid_y = (win[1] + win[3]) // 2 + 12
    left_x = win[0] + 122
    right_x = win[2] - 122
    slash_x = (win[0] + win[2]) // 2
    h = 48

    draw.line((left_x + 18, mid_y - h, left_x - 18, mid_y), fill=code_color, width=w, joint="curve")
    draw.line((left_x - 18, mid_y, left_x + 18, mid_y + h), fill=code_color, width=w, joint="curve")
    draw.line((right_x - 18, mid_y - h, right_x + 18, mid_y), fill=code_color, width=w, joint="curve")
    draw.line((right_x + 18, mid_y, right_x - 18, mid_y + h), fill=code_color, width=w, joint="curve")
    draw.line((slash_x + 24, mid_y - h - 8, slash_x - 24, mid_y + h + 8), fill=(125, 211, 252), width=12)

    # Prompt underscore.
    draw.rounded_rectangle((slash_x - 60, mid_y + 78, slash_x + 60, mid_y + 92), radius=6, fill=(167, 243, 208))


def draw_corner_spark(canvas: Image.Image) -> None:
    draw = ImageDraw.Draw(canvas)
    pts = [(393, 105), (408, 137), (440, 152), (408, 167), (393, 199), (378, 167), (346, 152), (378, 137)]
    draw.polygon(pts, fill=(236, 253, 245, 210))
    draw.ellipse((84, 384, 126, 426), fill=(186, 230, 253, 120))
    draw.ellipse((104, 404, 122, 422), fill=(236, 254, 255, 180))


def main() -> None:
    canvas = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw_background(canvas)
    rect = draw_card(canvas)
    draw_terminal_symbol(canvas, rect)
    draw_corner_spark(canvas)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUTPUT, "PNG")
    print(f"Wrote {OUTPUT}")


if __name__ == "__main__":
    main()

