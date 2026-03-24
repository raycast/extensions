#!/usr/bin/env python3
"""Generate PNG assets for the Kill It With Fire Raycast extension."""
import struct
import zlib
import os
import math


def make_png(path, width, height, pixels):
    """Write raw RGBA pixel data as a PNG file."""
    def chunk(ctype, data):
        c = ctype + data
        return struct.pack('>I', len(data)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    hdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    compressed = zlib.compress(bytes(pixels), 9)
    with open(path, 'wb') as f:
        f.write(b'\x89PNG\r\n\x1a\n')
        f.write(chunk(b'IHDR', hdr))
        f.write(chunk(b'IDAT', compressed))
        f.write(chunk(b'IEND', b''))


def generate_icon(path, size=512):
    """512x512 fire-gradient circle icon."""
    pixels = bytearray()
    for y in range(size):
        pixels.append(0)
        for x in range(size):
            cx, cy = x - size / 2, y - size / 2
            dist = math.sqrt(cx * cx + cy * cy)
            radius = size * 0.42
            if dist < radius:
                t = dist / radius
                ny = (y - size * 0.15) / size
                r = min(255, int(255 - 20 * t))
                g = min(255, max(0, int(200 * (1 - ny) * (1 - t * 0.5))))
                b = max(0, int(30 * (1 - ny * 2)))
                a = 255
            else:
                r, g, b, a = 0, 0, 0, 0
            pixels.extend([r, g, b, a])
    make_png(path, size, size, pixels)
    print(f"Created {path} ({size}x{size})")


def generate_screenshot(path, width=2000, height=1250):
    """2000x1250 dark background with fire gradient at the bottom half."""
    pixels = bytearray()
    for y in range(height):
        pixels.append(0)
        for x in range(width):
            ny = y / height
            if ny > 0.45:
                t = (ny - 0.45) / 0.55
                r = min(255, int(240 * t))
                g = min(255, max(0, int(120 * t * (1 - t))))
                b = max(0, int(20 * (1 - t)))
                a = 255
            else:
                r, g, b = 17, 17, 17
                a = 255
            pixels.extend([r, g, b, a])
    make_png(path, width, height, pixels)
    print(f"Created {path} ({width}x{height})")


if __name__ == '__main__':
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root = os.path.dirname(script_dir)
    generate_icon(os.path.join(root, 'assets', 'command-icon.png'))
    os.makedirs(os.path.join(root, 'metadata'), exist_ok=True)
    generate_screenshot(os.path.join(
        root, 'metadata', 'kill-it-with-fire-1.png'))
