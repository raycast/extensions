'''Generates assets/anydo.png (512x512 RGBA) with no third-party dependencies.'''
import math
import os
import struct
import zlib

SIZE = 512
SUPERSAMPLE = 3
ORANGE = (255, 122, 26)
WHITE = (255, 255, 255)


def inside_rounded_rect(x, y, width, height, radius):
    if radius <= 0:
        return 0.0 <= x <= width and 0.0 <= y <= height
    cx = min(max(x, radius), width - radius)
    cy = min(max(y, radius), height - radius)
    return (x - cx) ** 2 + (y - cy) ** 2 <= radius * radius


def distance_to_segment(px, py, ax, ay, bx, by):
    vx, vy = bx - ax, by - ay
    wx, wy = px - ax, py - ay
    c1 = vx * wx + vy * wy
    if c1 <= 0:
        return math.hypot(px - ax, py - ay)
    c2 = vx * vx + vy * vy
    if c2 <= c1:
        return math.hypot(px - bx, py - by)
    t = c1 / c2
    return math.hypot(px - (ax + t * vx), py - (ay + t * vy))


def write_png(path, rows):
    raw = b"".join(b"\x00" + bytes(channel for pixel in row for channel in pixel) for row in rows)

    def chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)

    header = struct.pack(">IIBBBBB", SIZE, SIZE, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", header) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b"")
    with open(path, "wb") as handle:
        handle.write(png)


def main():
    radius = SIZE * 0.24
    thickness = SIZE * 0.085
    # check mark: two strokes of a tick
    ax, ay = SIZE * 0.27, SIZE * 0.53
    bx, by = SIZE * 0.43, SIZE * 0.70
    cx, cy = SIZE * 0.75, SIZE * 0.32

    rows = []
    samples = SUPERSAMPLE * SUPERSAMPLE
    for y in range(SIZE):
        row = []
        for x in range(SIZE):
            shape_hits = 0
            check_hits = 0
            for sy in range(SUPERSAMPLE):
                py = y + (sy + 0.5) / SUPERSAMPLE
                for sx in range(SUPERSAMPLE):
                    px = x + (sx + 0.5) / SUPERSAMPLE
                    if inside_rounded_rect(px, py, SIZE, SIZE, radius):
                        shape_hits += 1
                        distance = min(
                            distance_to_segment(px, py, ax, ay, bx, by),
                            distance_to_segment(px, py, bx, by, cx, cy),
                        )
                        if distance <= thickness / 2:
                            check_hits += 1
            if shape_hits == 0:
                row.append((0, 0, 0, 0))
                continue
            white_ratio = check_hits / shape_hits
            colour = tuple(round(ORANGE[i] + (WHITE[i] - ORANGE[i]) * white_ratio) for i in range(3))
            alpha = round(255 * shape_hits / samples)
            row.append((colour[0], colour[1], colour[2], alpha))
        rows.append(row)

    target = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets", "anydo.png")
    os.makedirs(os.path.dirname(target), exist_ok=True)
    write_png(target, rows)
    print(f"wrote {target} ({os.path.getsize(target)} bytes)")


if __name__ == "__main__":
    main()
