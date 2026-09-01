#!/usr/bin/env python3
"""Собирает скриншоты для Raycast Store: 2000x1250 PNG на едином фоне.

Нужен, потому что монитор работает в 1x и Window Capture тут не помог: снимки окна
выходят ~815 px, а стору нужны 2000x1250. Фон — те же обои, растянутые и размытые:
плоская заливка давала заметный шов по краю снимка.
"""

import glob
import sys
from pathlib import Path

from PIL import Image, ImageEnhance, ImageFilter

TARGET = (2000, 1250)
INNER = (1900, 1190)  # поле для окна, остальное — поля


def cover(image, size):
    """Масштабируем с обрезкой, чтобы закрыть всё поле без полей."""
    scale = max(size[0] / image.width, size[1] / image.height)
    resized = image.convert("RGB").resize((round(image.width * scale), round(image.height * scale)), Image.LANCZOS)
    left = (resized.width - size[0]) // 2
    top = (resized.height - size[1]) // 2
    return resized.crop((left, top, left + size[0], top + size[1]))


def main(sources, out_dir):
    images = [Image.open(path) for path in sources]

    # Один фон на все кадры — обои с первого снимка. Стор требует одинаковый фон.
    background = cover(images[0], TARGET).filter(ImageFilter.GaussianBlur(28))
    background = ImageEnhance.Brightness(background).enhance(0.82)

    out_dir.mkdir(parents=True, exist_ok=True)
    for index, (path, image) in enumerate(zip(sources, images), start=1):
        scale = min(INNER[0] / image.width, INNER[1] / image.height)
        resized = image.convert("RGB").resize(
            (round(image.width * scale), round(image.height * scale)), Image.LANCZOS
        )
        frame = background.copy()
        frame.paste(resized, ((TARGET[0] - resized.width) // 2, (TARGET[1] - resized.height) // 2))
        out = out_dir / f"moex-bonds-{index}.png"
        frame.save(out, "PNG", optimize=True)
        print(f"{out.name}: {frame.size[0]}x{frame.size[1]}  <- {Path(path).name} ({image.width}x{image.height}, x{scale:.2f})")


if __name__ == "__main__":
    if len(sys.argv) > 2:
        main([Path(p) for p in sys.argv[1:-1]], Path(sys.argv[-1]))
    else:
        raise SystemExit("использование: make-screenshots.py <кадр.png> ... <папка>")
