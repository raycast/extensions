#!/usr/bin/env python3
"""Собирает скриншоты для Raycast Store: 2000x1250 PNG с полями ~12% на едином фоне.

Зачем скрипт. Монитор работает в 1x, Window Capture в Raycast здесь не сработал,
поэтому кадры снимаются обычным ⌘⇧4 и приводятся к формату здесь.

Почему с обрезкой. CI стора меряет поля до самого окна и требует 8–17% с каждой
стороны, симметрию по вертикали и одинаковый фон у всех кадров. Если оставить вокруг
окна кусок обоев из снимка, поля посчитаются вкривь, а фон у кадров разойдётся.
Поэтому окно вырезается по своим границам, а фон рисуется общий для всех.

Границы окна ищутся по краям: у окна прямые вертикальные и горизонтальные рамки,
они дают самые длинные линии перепада яркости. Порог по яркости не годится — окно
Raycast полупрозрачное, сквозь него просвечивают обои.
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

TARGET = (2000, 1250)
PADDING = 0.12  # доля поля с каждой стороны, цель стора
CORNER_RADIUS_1X = 19  # скругление окна Raycast в точках, с запасом — иначе в углах остаются обои


def window_box(image):
    """Границы окна: крайние длинные линии перепада яркости."""
    grey = image.convert("L")
    width, height = grey.size
    pixels = grey.filter(ImageFilter.FIND_EDGES).load()

    def lines(count, length, get):
        found = [i for i in range(2, count - 2) if sum(1 for j in range(2, length - 2) if get(i, j) > 30) / length > 0.6]
        if not found:
            raise SystemExit("не нашёл границы окна — сними кадр заново")
        return found[0], found[-1]

    top, bottom = lines(height, width, lambda y, x: pixels[x, y])
    left, right = lines(width, height, lambda x, y: pixels[x, y])
    return left, top, right, bottom


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius=radius, fill=255)
    return mask


def wallpaper_tones(image, box):
    """Средние цвета обоев над и под окном — из полей, которые всё равно обрезаем."""
    rgb = image.convert("RGB")
    left, top, right, bottom = box
    above = rgb.crop((0, 0, rgb.width, max(1, top)))
    below = rgb.crop((0, min(bottom, rgb.height - 1), rgb.width, rgb.height))
    tone = lambda strip: strip.resize((1, 1), Image.LANCZOS).getpixel((0, 0))
    return tone(above), tone(below)


def gradient(size, top, bottom):
    column = Image.new("RGB", (1, size[1]))
    for y in range(size[1]):
        k = y / max(1, size[1] - 1)
        column.putpixel((0, y), tuple(round(top[i] + (bottom[i] - top[i]) * k) for i in range(3)))
    return column.resize(size, Image.BICUBIC)


def main(sources, out_dir):
    images = [Image.open(path) for path in sources]
    boxes = [window_box(image) for image in images]

    # Один фон на все кадры: стор сверяет фоны между собой. Берём тона обоев из полей
    # первого снимка — размытый снимок целиком не годится, сквозь него проступает окно.
    top_tone, bottom_tone = wallpaper_tones(images[0], boxes[0])
    background = ImageEnhance.Brightness(gradient(TARGET, top_tone, bottom_tone)).enhance(0.92)

    inner = (round(TARGET[0] * (1 - 2 * PADDING)), round(TARGET[1] * (1 - 2 * PADDING)))
    out_dir.mkdir(parents=True, exist_ok=True)

    for index, (path, image, box) in enumerate(zip(sources, images, boxes), start=1):
        window = image.convert("RGB").crop(box)

        scale = min(inner[0] / window.width, inner[1] / window.height)
        size = (round(window.width * scale), round(window.height * scale))
        resized = window.resize(size, Image.LANCZOS)

        frame = background.copy()
        offset = ((TARGET[0] - size[0]) // 2, (TARGET[1] - size[1]) // 2)
        frame.paste(resized, offset, rounded_mask(size, round(CORNER_RADIUS_1X * scale)))

        out = out_dir / f"moex-bonds-{index}.png"
        frame.save(out, "PNG", optimize=True)
        print(
            f"{out.name}: окно {window.width}x{window.height} -> {size[0]}x{size[1]} (x{scale:.2f}), "
            f"поля {offset[0] / TARGET[0]:.1%} / {offset[1] / TARGET[1]:.1%}"
        )


if __name__ == "__main__":
    if len(sys.argv) < 3:
        raise SystemExit("использование: make-screenshots.py <кадр.png> ... <папка>")
    main([Path(p) for p in sys.argv[1:-1]], Path(sys.argv[-1]))
