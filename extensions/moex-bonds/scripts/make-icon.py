#!/usr/bin/env python3
"""Генерирует assets/extension-icon.png (512x512) без внешних зависимостей.

Мотив: тёмная скруглённая плашка + три растущих столбца котировок и стрелка.
Рисуем с 4-кратным суперсэмплингом ради сглаживания, затем усредняем.
"""

import os
import struct
import zlib

SIZE = 512
SS = 4  # supersampling
W = SIZE * SS

BG_TOP = (14, 34, 64)
BG_BOTTOM = (10, 22, 44)
BAR = (233, 236, 244)
ACCENT = (255, 196, 61)

RADIUS = int(112 * SS)


def rounded_rect_mask(x0, y0, x1, y1, r):
    """Плашка со скруглением через расстояние до ближайшего центра угла."""

    def inside(x, y):
        dx = max(x0 + r - x, 0, x - (x1 - 1 - r))
        dy = max(y0 + r - y, 0, y - (y1 - 1 - r))
        return dx * dx + dy * dy <= r * r

    return inside


def main():
    bg_inside = rounded_rect_mask(0, 0, W, W, RADIUS)

    # Столбцы: x_left, ширина, высота от низа (в долях холста)
    bars = [
        (0.20, 0.13, 0.30),
        (0.375, 0.13, 0.46),
        (0.55, 0.13, 0.62),
    ]
    bar_rects = [
        (int(x * W), int((x + w) * W), int((1 - 0.20 - h) * W), int((1 - 0.20) * W))
        for x, w, h in bars
    ]

    # Стрелка вверх-вправо: толстая диагональ + треугольный наконечник
    ax0, ay0 = 0.19 * W, 0.50 * W
    ax1, ay1 = 0.74 * W, 0.235 * W
    dx, dy = ax1 - ax0, ay1 - ay0
    seg_len = (dx * dx + dy * dy) ** 0.5
    ux, uy = dx / seg_len, dy / seg_len   # направление
    nx, ny = -uy, ux                      # нормаль
    half = 0.030 * W                      # полутолщина линии
    head_len = 0.155 * W
    head_half = 0.085 * W

    def on_arrow(x, y):
        rx, ry = x - ax0, y - ay0
        along = rx * ux + ry * uy
        across = rx * nx + ry * ny
        if 0.0 <= along <= seg_len - head_len * 0.55 and abs(across) <= half:
            return True
        # наконечник: треугольник, сужающийся к концу диагонали
        tip = seg_len
        if tip - head_len <= along <= tip:
            k = (tip - along) / head_len
            return abs(across) <= head_half * k
        return False

    rows = []
    for py in range(SIZE):
        row = bytearray()
        for px in range(SIZE):
            r_acc = g_acc = b_acc = a_acc = 0
            for sy in range(SS):
                y = py * SS + sy
                for sx in range(SS):
                    x = px * SS + sx
                    if not bg_inside(x, y):
                        continue
                    k = y / W
                    r = int(BG_TOP[0] + (BG_BOTTOM[0] - BG_TOP[0]) * k)
                    g = int(BG_TOP[1] + (BG_BOTTOM[1] - BG_TOP[1]) * k)
                    b = int(BG_TOP[2] + (BG_BOTTOM[2] - BG_TOP[2]) * k)
                    for bx0, bx1, by0, by1 in bar_rects:
                        if bx0 <= x < bx1 and by0 <= y < by1:
                            r, g, b = BAR
                            break
                    if on_arrow(x, y):
                        r, g, b = ACCENT
                    r_acc += r
                    g_acc += g
                    b_acc += b
                    a_acc += 255
            n = SS * SS
            if a_acc == 0:
                row += bytes((0, 0, 0, 0))
            else:
                cover = a_acc // 255
                row += bytes((r_acc // cover, g_acc // cover, b_acc // cover, a_acc // n))
        rows.append(bytes(row))

    raw = b"".join(b"\x00" + r for r in rows)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(raw, 9))
    png += chunk(b"IEND", b"")

    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "extension-icon.png")
    with open(out, "wb") as fh:
        fh.write(png)
    print(out, len(png), "bytes")


if __name__ == "__main__":
    main()
