#!/usr/bin/env python3
"""Generate a 512x512 tmux extension icon.

Design: Catppuccin Mocha rounded square + bold ">_" prompt in green.
Re-run after editing constants to iterate.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

SIZE = 512
RADIUS = 112

BG = (30, 30, 46, 255)          # mocha base
FG = (166, 227, 161, 255)        # mocha green
SHADOW = (0, 0, 0, 60)
PANE = (49, 50, 68, 255)         # mocha surface0

FONT_PATH = "/System/Library/Fonts/SFNSMono.ttf"
FONT_SIZE = 260
TEXT = ">_"

OUT = Path(__file__).parent.parent / "assets" / "tmux-icon.png"


def main() -> None:
    img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Rounded square background
    draw.rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=RADIUS, fill=BG)

    # Subtle title-bar strip (faux terminal window)
    bar_h = 56
    draw.rounded_rectangle(
        (0, 0, SIZE - 1, bar_h + RADIUS),
        radius=RADIUS,
        fill=PANE,
    )
    # mask the bottom of the strip to make it flat
    draw.rectangle((0, bar_h, SIZE, bar_h + RADIUS + 4), fill=PANE)
    draw.rectangle((0, bar_h, SIZE, bar_h + 1), fill=BG)
    draw.rectangle((0, bar_h, SIZE, SIZE), fill=BG)
    # redraw rounded square clipped over the inset
    draw.rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=RADIUS, outline=None)

    # Re-do strip properly: title bar across the top
    img2 = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(img2)
    d2.rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=RADIUS, fill=BG)
    # title bar (top strip with rounded top corners only)
    d2.rounded_rectangle((0, 0, SIZE - 1, bar_h + RADIUS), radius=RADIUS, fill=PANE)
    d2.rectangle((0, bar_h, SIZE - 1, bar_h + RADIUS), fill=BG)

    # three traffic-light dots in title bar
    dot_y = bar_h // 2
    dot_r = 10
    for i, color in enumerate([(243, 139, 168, 255), (249, 226, 175, 255), (166, 227, 161, 255)]):
        cx = 28 + i * 38
        d2.ellipse((cx - dot_r, dot_y - dot_r, cx + dot_r, dot_y + dot_r), fill=color)

    # Main prompt text
    font = ImageFont.truetype(FONT_PATH, FONT_SIZE)
    bbox = d2.textbbox((0, 0), TEXT, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    cx = (SIZE - tw) // 2 - bbox[0]
    cy = (SIZE - th) // 2 - bbox[1] + bar_h // 2  # shift slightly down for visual center
    d2.text((cx, cy), TEXT, fill=FG, font=font)

    img2.save(OUT, "PNG")
    print(f"wrote {OUT}  ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
