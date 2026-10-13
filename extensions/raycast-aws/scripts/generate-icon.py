"""Generate assets/icon.png: a cloud (AWS) + checkmark badge (Granted/Assume access) mark."""

from PIL import Image, ImageDraw

S = 2048  # supersample size, downscaled at the end for anti-aliasing
OUT = 512

NAVY = (22, 30, 45, 255)  # AWS "squid ink" style background
CLOUD = (242, 243, 243, 255)  # soft white cloud
ORANGE = (255, 153, 0, 255)  # AWS orange accent
BADGE_RING = NAVY

img = Image.new("RGBA", (S, S), NAVY)
draw = ImageDraw.Draw(img)

cx, cy = S / 2, S * 0.46


def circle(center, r, fill):
    x, y = center
    draw.ellipse([x - r, y - r, x + r, y + r], fill=fill)


def rounded_rect(box, radius, fill):
    draw.rounded_rectangle(box, radius=radius, fill=fill)


# --- Cloud silhouette (AWS): base + three overlapping lobes ---
rounded_rect(
    [cx - 0.30 * S, cy - 0.02 * S, cx + 0.30 * S, cy + 0.17 * S],
    radius=0.09 * S,
    fill=CLOUD,
)
circle((cx - 0.20 * S, cy - 0.02 * S), 0.145 * S, CLOUD)
circle((cx - 0.01 * S, cy - 0.12 * S), 0.20 * S, CLOUD)
circle((cx + 0.20 * S, cy - 0.01 * S), 0.135 * S, CLOUD)

# --- Badge (Granted = access approved, Assume = taking the action) ---
badge_center = (cx + 0.27 * S, cy + 0.22 * S)
badge_r = 0.175 * S
circle(badge_center, badge_r + 0.018 * S, BADGE_RING)  # thin ring for separation from cloud
circle(badge_center, badge_r, ORANGE)

bx, by = badge_center
r = badge_r
check_width = 0.22 * r
p1 = (bx - 0.48 * r, by + 0.02 * r)
p2 = (bx - 0.12 * r, by + 0.38 * r)
p3 = (bx + 0.50 * r, by - 0.32 * r)

draw.line([p1, p2], fill=CLOUD, width=int(check_width))
draw.line([p2, p3], fill=CLOUD, width=int(check_width))
for p in (p1, p2, p3):
    circle(p, check_width / 2, CLOUD)

img = img.resize((OUT, OUT), Image.LANCZOS)
img.save("assets/icon.png")
print("wrote assets/icon.png", img.size)
