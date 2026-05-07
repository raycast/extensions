#!/usr/bin/env python3
"""Generate Raycast store screenshots for the Codex extension."""

from PIL import Image, ImageDraw, ImageFont
import os

W, H = 2880, 1800
ASSETS = os.path.join(os.path.dirname(__file__), "..", "assets")
os.makedirs(ASSETS, exist_ok=True)

# ── colour palette ──────────────────────────────────────────────────────────
BG          = (10,  10,  18)
PANEL_BG    = (22,  22,  34)
PANEL_EDGE  = (40,  40,  60)
SEARCH_BG   = (30,  30,  44)
ITEM_HOVER  = (35,  35,  52)
TEXT_PRI    = (240, 240, 248)
TEXT_SEC    = (130, 130, 160)
TEXT_DIM    = (80,  80, 110)
ORANGE      = (255, 160,  60)
ACCENT      = ( 90, 100, 220)

# ── font helpers ─────────────────────────────────────────────────────────────
def font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/SFNSText.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    if bold:
        candidates = ["/System/Library/Fonts/SFNSDisplay.ttf"] + candidates
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
            except Exception:
                continue
    return ImageFont.load_default()

F_TITLE   = font(28, bold=True)
F_BODY    = font(24)
F_SMALL   = font(20)
F_TINY    = font(17)
F_SECTION = font(19)
F_LABEL   = font(22, bold=True)
F_SEARCH  = font(26)
F_HEADING = font(48, bold=True)
F_SUB     = font(30)

# ── drawing helpers ───────────────────────────────────────────────────────────
def rounded_rect(draw, xy, r, fill=None, outline=None, width=1):
    x1, y1, x2, y2 = xy
    draw.rounded_rectangle([x1, y1, x2, y2], radius=r, fill=fill, outline=outline, width=width)

def circle(draw, cx, cy, r, fill):
    draw.ellipse([cx-r, cy-r, cx+r, cy+r], fill=fill)

def draw_terminal_icon(draw, cx, cy, size, color):
    s = size * 0.28
    pts = [(cx - s*0.6, cy - s*0.7), (cx - s*0.05, cy), (cx - s*0.6, cy + s*0.7)]
    lw = max(2, int(s*0.18))
    draw.line([pts[0], pts[1]], fill=color, width=lw)
    draw.line([pts[1], pts[2]], fill=color, width=lw)
    draw.line([(cx + s*0.05, cy + s*0.55), (cx + s*0.75, cy + s*0.55)],
              fill=color, width=max(2, int(s*0.15)))

def gradient_bg(img, top_color, bot_color):
    draw = ImageDraw.Draw(img)
    for py in range(H):
        t = py / H
        r = int(top_color[0]*(1-t) + bot_color[0]*t)
        g = int(top_color[1]*(1-t) + bot_color[1]*t)
        b = int(top_color[2]*(1-t) + bot_color[2]*t)
        draw.line([(0, py), (W, py)], fill=(r, g, b))

def draw_panel(draw, x, y, w, h):
    for s in range(24, 0, -1):
        rounded_rect(draw, [x-s//2, y+s, x+w+s//2, y+h+s],
                     r=20+s, outline=(0, 0, 10))
    rounded_rect(draw, [x, y, x+w, y+h], r=16,
                 fill=PANEL_BG, outline=PANEL_EDGE, width=1)

def draw_search_bar(draw, x, y, w, placeholder, query=""):
    bar_h = 56
    rounded_rect(draw, [x, y, x+w, y+bar_h], r=10, fill=SEARCH_BG)
    mx, my = x+22, y+bar_h//2
    circle(draw, mx, my, 9, TEXT_SEC)
    circle(draw, mx, my, 6, SEARCH_BG)
    draw.line([(mx+6, my+6), (mx+13, my+13)], fill=TEXT_SEC, width=3)
    txt = query if query else placeholder
    col = TEXT_PRI if query else TEXT_DIM
    draw.text((x+46, y+15), txt, font=F_SEARCH, fill=col)
    if query:
        tw = draw.textlength(query, font=F_SEARCH)
        draw.line([(x+46+tw+2, y+15), (x+46+tw+2, y+41)], fill=TEXT_PRI, width=2)

def draw_section_header(draw, x, y, w, title, count):
    draw.text((x+16, y+4), title, font=F_SECTION, fill=TEXT_DIM)
    if count:
        cw = draw.textlength(str(count), font=F_SECTION)
        draw.text((x+w-cw-16, y+4), str(count), font=F_SECTION, fill=TEXT_DIM)
    draw.line([(x+8, y+30), (x+w-8, y+30)], fill=PANEL_EDGE, width=1)

def draw_thread_row(draw, x, y, w, title, branch, time_str,
                    status=None, tag=None, hover=False):
    row_h = 52
    if hover:
        rounded_rect(draw, [x+4, y+1, x+w-4, y+row_h-1], r=8, fill=ITEM_HOVER)

    icon_cx, icon_cy = x + 30, y + row_h//2
    icon_bg = ACCENT if status == "in_progress" else (48, 48, 68)
    circle(draw, icon_cx, icon_cy, 16, icon_bg)
    draw_terminal_icon(draw, icon_cx, icon_cy, 32, TEXT_PRI)

    title_x = x + 56
    if branch:
        draw.text((title_x, y + 6), title, font=F_LABEL, fill=TEXT_PRI)
        bw = draw.textlength(branch, font=F_TINY)
        rounded_rect(draw, [title_x-2, y+30, title_x+bw+6, y+48], r=4, fill=(38,38,56))
        draw.text((title_x+2, y+31), branch, font=F_TINY, fill=TEXT_SEC)
    else:
        draw.text((title_x, y + 16), title, font=F_LABEL, fill=TEXT_PRI)

    rx = x + w - 14
    if status == "in_progress":
        circle(draw, rx - 7, y + row_h//2, 7, ORANGE)
        rx -= 22
    tw = draw.textlength(time_str, font=F_SMALL)
    draw.text((rx - tw, y + 18), time_str, font=F_SMALL, fill=TEXT_DIM)
    if tag:
        rx -= tw + 14
        tagw = draw.textlength(tag, font=F_TINY)
        rounded_rect(draw, [rx-tagw-10, y+14, rx+2, y+38], r=5,
                     fill=(38,38,56), outline=(56,56,76), width=1)
        draw.text((rx-tagw-4, y+16), tag, font=F_TINY, fill=TEXT_SEC)

# ═══════════════════════════════════════════════════════════════════════════════
# Screenshot 1 — Search Threads
# ═══════════════════════════════════════════════════════════════════════════════
def make_screenshot_1():
    img = Image.new("RGB", (W, H))
    gradient_bg(img, (14, 10, 30), (6, 6, 18))
    draw = ImageDraw.Draw(img)

    PW, PH = 1060, 1330
    px = (W - PW) // 2
    py = (H - PH) // 2 - 30

    draw_panel(draw, px, py, PW, PH)

    cx = px + 24
    cy = py + 20

    draw_search_bar(draw, cx, cy, PW-48, "Search by title, project, branch, model…", "auth")
    cy += 74

    # Active section
    draw_section_header(draw, cx, cy, PW-48, "Active", 2)
    cy += 40

    draw_thread_row(draw, cx, cy, PW-48, "Implement OAuth2 flow", "feat/auth", "6s ago",
                    status="in_progress", tag="~/api-server", hover=True)
    cy += 56
    draw_thread_row(draw, cx, cy, PW-48, "Refactor database models", "feat/db-v2", "9s ago",
                    status="in_progress", tag="~/backend")
    cy += 60

    # ~/work/api-server
    draw_section_header(draw, cx, cy, PW-48, "~/work/api-server", 4)
    cy += 40

    rows1 = [
        ("Implement OAuth2 flow",       "feat/auth",   "6s ago",  "in_progress", True),
        ("Add rate limiting middleware", "main",        "4m ago",  None,          False),
        ("Write unit tests for /users",  "feat/tests",  "1h ago",  None,          False),
        ("Fix CORS headers on prod",     None,          "3h ago",  None,          False),
    ]
    for title, branch, ts, status, hover in rows1:
        draw_thread_row(draw, cx, cy, PW-48, title, branch, ts, status=status, hover=hover)
        cy += 56

    cy += 4

    # ~/work/frontend
    draw_section_header(draw, cx, cy, PW-48, "~/work/frontend", 3)
    cy += 40

    rows2 = [
        ("Build dashboard charts",  "feat/charts", "18m ago", None, False),
        ("Dark mode toggle",         "main",        "2h ago",  None, False),
        ("Fix mobile nav overflow",  None,          "1d ago",  None, False),
    ]
    for title, branch, ts, status, hover in rows2:
        draw_thread_row(draw, cx, cy, PW-48, title, branch, ts, status=status, hover=hover)
        cy += 56

    cy += 4

    # ~/work/ml-pipeline
    draw_section_header(draw, cx, cy, PW-48, "~/work/ml-pipeline", 2)
    cy += 40

    rows3 = [
        ("Tune hyperparameters for BERT", "experiment/v3", "4h ago", None, False),
        ("Data preprocessing pipeline",   None,            "1d ago", None, False),
    ]
    for title, branch, ts, status, hover in rows3:
        draw_thread_row(draw, cx, cy, PW-48, title, branch, ts, status=status, hover=hover)
        cy += 56

    # bottom bar
    bar_y = py + PH - 52
    draw.line([(px+1, bar_y), (px+PW-1, bar_y)], fill=PANEL_EDGE, width=1)
    draw.text((px+20, bar_y+14), "Search Codex Threads", font=F_SMALL, fill=TEXT_DIM)
    draw.text((px+PW-210, bar_y+14), "Open in Codex   ↵", font=F_SMALL, fill=TEXT_SEC)

    # caption
    cap_y = py + PH + 52
    cap = "Search Codex Threads"
    cw = draw.textlength(cap, font=F_HEADING)
    draw.text(((W-cw)//2, cap_y), cap, font=F_HEADING, fill=TEXT_PRI)
    sub = "All threads grouped by project · search title, branch, model, or message"
    sw = draw.textlength(sub, font=F_SUB)
    draw.text(((W-sw)//2, cap_y+64), sub, font=F_SUB, fill=TEXT_SEC)

    out = os.path.join(ASSETS, "screenshot-1.png")
    img.save(out, "PNG")
    print(f"Saved {out}")

# ═══════════════════════════════════════════════════════════════════════════════
# Screenshot 2 — Running Threads
# ═══════════════════════════════════════════════════════════════════════════════
def make_screenshot_2():
    img = Image.new("RGB", (W, H))
    gradient_bg(img, (10, 16, 30), (5, 8, 18))
    draw = ImageDraw.Draw(img)

    PW, PH = 1060, 860
    px = (W - PW) // 2
    py = (H - PH) // 2 - 50

    draw_panel(draw, px, py, PW, PH)

    cx = px + 24
    cy = py + 20

    draw_search_bar(draw, cx, cy, PW-48, "Threads with activity in the last 60s…")
    cy += 74

    draw_section_header(draw, cx, cy, PW-48, "Running Now", 3)
    cy += 40

    running = [
        ("Implement OAuth2 flow",      "feat/auth",    "2s ago", True),
        ("Refactor database models",    "feat/db-v2",   "5s ago", False),
        ("Build dashboard charts",      "feat/charts",  "8s ago", False),
    ]
    for title, branch, ts, hover in running:
        draw_thread_row(draw, cx, cy, PW-48, title, branch, ts,
                        status="in_progress", hover=hover)
        cy += 60

    cy += 20
    # live refresh pill
    pill_w, pill_h = 360, 40
    pill_x = cx + (PW - 48 - pill_w) // 2
    rounded_rect(draw, [pill_x, cy, pill_x+pill_w, cy+pill_h], r=20,
                 fill=(30, 34, 50), outline=(50, 54, 80), width=1)
    circle(draw, pill_x+22, cy+20, 7, ORANGE)
    draw.text((pill_x+38, cy+10), "Auto-refreshes every 3 seconds", font=F_TINY, fill=TEXT_SEC)
    cy += 52

    # bottom bar
    bar_y = py + PH - 52
    draw.line([(px+1, bar_y), (px+PW-1, bar_y)], fill=PANEL_EDGE, width=1)
    draw.text((px+20, bar_y+14), "Running Codex Threads", font=F_SMALL, fill=TEXT_DIM)
    draw.text((px+PW-210, bar_y+14), "Open in Codex   ↵", font=F_SMALL, fill=TEXT_SEC)

    # caption
    cap_y = py + PH + 52
    cap = "Running Threads"
    cw = draw.textlength(cap, font=F_HEADING)
    draw.text(((W-cw)//2, cap_y), cap, font=F_HEADING, fill=TEXT_PRI)
    sub = "Live view · auto-refreshes every 3s · see what Codex is working on right now"
    sw = draw.textlength(sub, font=F_SUB)
    draw.text(((W-sw)//2, cap_y+64), sub, font=F_SUB, fill=TEXT_SEC)

    out = os.path.join(ASSETS, "screenshot-2.png")
    img.save(out, "PNG")
    print(f"Saved {out}")

if __name__ == "__main__":
    make_screenshot_1()
    make_screenshot_2()
    print("Done.")
