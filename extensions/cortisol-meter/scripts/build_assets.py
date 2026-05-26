from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"

LEVELS = {
    "low": 150.0,
    "medium": 90.0,
    "high": 38.0,
}


def create_menu_bar_icon(angle: float) -> Image.Image:
    scale = 16
    image = Image.new("RGBA", (32 * scale, 32 * scale), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    stroke = round(4.7 * scale)
    arc_box = (-1.0 * scale, 5.8 * scale, 33.0 * scale, 39.8 * scale)
    draw.arc(arc_box, start=200, end=340, fill=(0, 0, 0, 255), width=stroke)

    center = (16.0, 26.8)
    radians = math.radians(angle)
    end = (center[0] + math.cos(radians) * 10.2, center[1] - math.sin(radians) * 10.2)
    draw.line(
        (center[0] * scale, center[1] * scale, end[0] * scale, end[1] * scale),
        fill=(0, 0, 0, 255),
        width=round(4.15 * scale),
    )

    hub_radius = 3.65 * scale
    draw.ellipse(
        (
            center[0] * scale - hub_radius,
            center[1] * scale - hub_radius,
            center[0] * scale + hub_radius,
            center[1] * scale + hub_radius,
        ),
        fill=(0, 0, 0, 255),
    )

    return image.resize((32, 32), Image.Resampling.LANCZOS)


def main() -> None:
    ASSETS.mkdir(exist_ok=True)
    icons = {level: create_menu_bar_icon(angle) for level, angle in LEVELS.items()}

    for level, icon in icons.items():
        icon.save(ASSETS / f"menubar-{level}.png")

    print("Wrote menu bar assets")


if __name__ == "__main__":
    main()
