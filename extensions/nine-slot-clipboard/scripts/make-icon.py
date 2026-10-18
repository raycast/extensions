#!/usr/bin/env python3
"""Draw the 512x512 extension icon."""

from PIL import Image, ImageDraw

SIZE = 512
image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
pixels = image.load()

for y in range(SIZE):
    blend = y / (SIZE - 1)
    red = int(36 + (88 - 36) * blend)
    green = int(92 + (72 - 92) * blend)
    blue = int(230 + (214 - 230) * blend)
    for x in range(SIZE):
        pixels[x, y] = (red, green, blue, 255)

mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, SIZE - 1, SIZE - 1), radius=112, fill=255)
image.putalpha(mask)

draw = ImageDraw.Draw(image)
ink = (255, 255, 255, 255)
accent = (255, 186, 64, 255)
slot = (47, 86, 214, 255)

draw.rounded_rectangle((156, 168, 356, 392), radius=36, fill=ink)
draw.rounded_rectangle((214, 128, 298, 188), radius=20, fill=ink)
draw.rounded_rectangle((232, 146, 280, 176), radius=10, fill=(52, 104, 224, 255))

origin_x = 184
origin_y = 204
cell = 44
gap = 12
for row in range(3):
    for column in range(3):
        x = origin_x + column * (cell + gap)
        y = origin_y + row * (cell + gap)
        color = accent if (row, column) == (0, 0) else slot
        draw.rounded_rectangle((x, y, x + cell, y + cell), radius=10, fill=color)

image.save("assets/extension-icon.png", "PNG")
