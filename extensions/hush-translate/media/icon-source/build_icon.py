import math, sys
# Usage: python3 media/icon-source/build_icon.py media/icon-source/extension_icon.svg
# then rasterise the SVG to assets/extension_icon.png at 512x512.
# Hush Translate icon: a squircle tile in sky blue, with the smiling bubble and word card as Liquid Glass.
def squircle(size, inset=0, n=5.0, steps=256):
    # Superellipse |x|^n + |y|^n = 1, the continuous-corner shape of Apple icons.
    a = size / 2 - inset; c = size / 2; pts = []
    for i in range(steps):
        t = 2 * math.pi * i / steps
        ct, st = math.cos(t), math.sin(t)
        x = c + a * math.copysign(abs(ct) ** (2 / n), ct)
        y = c + a * math.copysign(abs(st) ** (2 / n), st)
        pts.append(f"{x:.2f} {y:.2f}")
    return "M" + "L".join(pts) + "Z"

def bubble():
    C = (14.2, 13.4, 9.8)
    pt = lambda d: (C[0] + C[2] * math.cos(math.radians(d)), C[1] + C[2] * math.sin(math.radians(d)))
    a, b = pt(160), pt(110)
    return f"M{a[0]:.3f} {a[1]:.3f}A{C[2]} {C[2]} 0 1 1 {b[0]:.3f} {b[1]:.3f}L5.6 24.2Q3.6 25 4.1 23Z"

def rp(pts, rs):
    # Rounded polygon: each corner rounded by its radius (quadratic corners).
    out = []; n = len(pts)
    for i in range(n):
        p0, p1, p2 = pts[i - 1], pts[i], pts[(i + 1) % n]
        r = rs[i]
        def toward(p, q, d):
            L = math.hypot(q[0] - p[0], q[1] - p[1]); d = min(d, L / 2)
            return (p[0] + (q[0] - p[0]) * d / L, p[1] + (q[1] - p[1]) * d / L)
        s, e = toward(p1, p0, r), toward(p1, p2, r)
        out.append(("M" if i == 0 else "L") + f"{s[0]:.3f} {s[1]:.3f}Q{p1[0]} {p1[1]} {e[0]:.3f} {e[1]:.3f}")
    return "".join(out) + "Z"

KR = 2.2
card = rp([(18.8, 0.2), (28.2, 0.2), (28.2, 8.6), (23.2, 8.6), (20.8, 10.8), (21, 8.6), (18.8, 8.6)], [KR, KR, KR, 0.5, 0.6, 0.5, KR])
eye = lambda x: f"M{x-1.7:.2f} 12.2Q{x:.2f} 9.8 {x+1.7:.2f} 12.2"
tile = squircle(512, 0)
B = bubble()
U = 12.6  # one Kubai unit in pixels
tx, ty = 256 - 16.1 * U, 256 - 12.6 * U + 6

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
<defs>
  <clipPath id="tile"><path d="{tile}"/></clipPath>
  <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#8FDCFF"/><stop offset="0.55" stop-color="#38BDF8"/><stop offset="1" stop-color="#0A93D6"/>
  </linearGradient>
  <radialGradient id="glow" cx="0.3" cy="0.12" r="0.75">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.55"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
  </radialGradient>
  <linearGradient id="tileRim" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.75"/><stop offset="0.35" stop-color="#FFFFFF" stop-opacity="0.08"/>
    <stop offset="0.8" stop-color="#FFFFFF" stop-opacity="0"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.35"/>
  </linearGradient>
  <!-- Glass body: frosted white that lets the sky through, brighter at the top. -->
  <linearGradient id="glass" x1="0" y1="0" x2="0.25" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.92"/><stop offset="0.6" stop-color="#F2FBFF" stop-opacity="0.72"/>
    <stop offset="1" stop-color="#D6F1FF" stop-opacity="0.62"/>
  </linearGradient>
  <!-- Specular rim: light catches the top-left edge and, refracted, the bottom-right. -->
  <linearGradient id="rim" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="#FFFFFF" stop-opacity="1"/><stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0.15"/>
    <stop offset="0.75" stop-color="#FFFFFF" stop-opacity="0.1"/><stop offset="1" stop-color="#FFFFFF" stop-opacity="0.9"/>
  </linearGradient>
  <!-- Thickness: a band of sky tint pooling along the lower inside edge. -->
  <linearGradient id="depth" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0.55" stop-color="#38BDF8" stop-opacity="0"/><stop offset="1" stop-color="#38BDF8" stop-opacity="0.35"/>
  </linearGradient>
  <filter id="shadow" x="-30%" y="-30%" width="160%" height="170%">
    <feDropShadow dx="0" dy="{1.2}" stdDeviation="{1.1}" flood-color="#055E8C" flood-opacity="0.32"/>
  </filter>
  <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.5"/></filter>
</defs>
<g clip-path="url(#tile)">
  <rect width="512" height="512" fill="url(#sky)"/>
  <rect width="512" height="512" fill="url(#glow)"/>
</g>
<path d="{tile}" fill="none" stroke="url(#tileRim)" stroke-width="5" clip-path="url(#tile)"/>
<g transform="translate({tx:.2f} {ty:.2f}) scale({U})">
  <g filter="url(#shadow)"><path d="{B}" fill="url(#glass)"/></g>
  <path d="{B}" fill="url(#depth)"/>
  <path d="{B}" fill="none" stroke="url(#rim)" stroke-width="0.42"/>
  <ellipse cx="10.6" cy="6.6" rx="4.2" ry="1.5" transform="rotate(-24 10.6 6.6)" fill="#FFFFFF" opacity="0.75" filter="url(#soft)"/>
  <ellipse cx="7.8" cy="16.2" rx="1.6" ry="1.15" fill="#7DD3FC" opacity="0.75"/>
  <ellipse cx="20.6" cy="16.2" rx="1.6" ry="1.15" fill="#7DD3FC" opacity="0.75"/>
  <path d="{eye(10.6)}{eye(17.6)}M12.4 16Q14.2 18 16 16" fill="none" stroke="#0B7DBE" stroke-width="1.6" stroke-linecap="round"/>
  <g filter="url(#shadow)"><path d="{card}" fill="url(#glass)"/></g>
  <path d="{card}" fill="url(#depth)"/>
  <path d="{card}" fill="none" stroke="url(#rim)" stroke-width="0.42"/>
  <text x="23.5" y="7" text-anchor="middle" font-family="-apple-system, 'SF Pro Rounded', 'Helvetica Neue', sans-serif" font-size="6.6" font-weight="800" fill="#0B7DBE">A</text>
</g>
</svg>'''
open(sys.argv[1], "w").write(svg)
