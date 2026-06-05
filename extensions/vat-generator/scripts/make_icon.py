"""Generate the extension icon (512x512 PNG)."""
from PIL import Image, ImageDraw, ImageFont

SIZE = 512
img = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
draw = ImageDraw.Draw(img)

# Rounded-square background with a simple vertical gradient.
radius = 112
top = (37, 99, 235)      # blue-600
bottom = (29, 78, 216)   # blue-700
grad = Image.new("RGBA", (SIZE, SIZE), top + (255,))
gd = ImageDraw.Draw(grad)
for y in range(SIZE):
    t = y / (SIZE - 1)
    r = int(top[0] + (bottom[0] - top[0]) * t)
    g = int(top[1] + (bottom[1] - top[1]) * t)
    b = int(top[2] + (bottom[2] - top[2]) * t)
    gd.line([(0, y), (SIZE, y)], fill=(r, g, b, 255))

mask = Image.new("L", (SIZE, SIZE), 0)
ImageDraw.Draw(mask).rounded_rectangle([0, 0, SIZE - 1, SIZE - 1], radius=radius, fill=255)
img.paste(grad, (0, 0), mask)


def load_font(size):
    for path in [
        "/System/Library/Fonts/SFNSRounded.ttf",
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


text = "VAT"
font = load_font(170)
bbox = draw.textbbox((0, 0), text, font=font)
tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
draw.text(((SIZE - tw) / 2 - bbox[0], (SIZE - th) / 2 - bbox[1] - 6), text, font=font, fill=(255, 255, 255, 255))

# Small percent badge to hint "tax".
pct_font = load_font(96)
draw.text((SIZE / 2 - 30, SIZE / 2 + 78), "%", font=pct_font, fill=(191, 219, 254, 255))

img.save("icon.png")
print("wrote icon.png")
