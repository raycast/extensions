import os
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from cairosvg import svg2png   # SVG→PNG 변환

# --------------------------------------------------
# 0) 글리프별 색상 매핑
# --------------------------------------------------
color_map = {
    "video_audio_call":  "#71a5ff",
    "video_youtube":     "#ff0000",
    "web":               "#71a5ff",
    "drive_presentation":"#fbbc05",
    "markdown":          "#71a5ff",
    "article":           "#71a5ff",
    "description":       "#71a5ff",
    "drive_pdf":         "#ea4335",
}

# --------------------------------------------------
# 1) 폰트 파일 경로 (WOFF2/TTF/OTF 등)
# --------------------------------------------------
font_path = "./font.woff2"

# --------------------------------------------------
# 2) 추출할 글리프 목록
# --------------------------------------------------
glyph_names = list(color_map.keys())

# --------------------------------------------------
# 3) 결과(PNG) 저장 폴더
# --------------------------------------------------
output_dir = "./"
os.makedirs(output_dir, exist_ok=True)

# --------------------------------------------------
# 4) TTFont 로드
# --------------------------------------------------
font = TTFont(font_path)
glyph_set = font.getGlyphSet()

for name in glyph_names:
    if name not in glyph_set:
        print(f"⚠️  '{name}' 글리프가 폰트에 없습니다.")
        continue

    glyph = glyph_set[name]

    # ---------- SVG Path ----------
    pen = SVGPathPen(glyph_set)
    glyph.draw(pen)
    path_d = pen.getCommands()

    # ---------- Bounding Box ----------
    bpen = BoundsPen(glyph_set)
    glyph.draw(bpen)
    if bpen.bounds is None:
        print(f"⚠️  '{name}' 글리프에 경로가 없습니다.")
        continue

    xMin, yMin, xMax, yMax = bpen.bounds
    width, height = xMax - xMin, yMax - yMin

    # ---------- SVG 문자열 (메모리 전용) ----------
    viewBox   = f"0 0 {width} {height}"
    transform = f"matrix(1 0 0 -1 {-xMin} {yMax})"
    fill      = color_map.get(name, "#000000")

    svg_str = (
        f'<svg xmlns="http://www.w3.org/2000/svg" '
        f'viewBox="{viewBox}" fill="{fill}">\n'
        f'  <path d="{path_d}" transform="{transform}"/>\n'
        f'</svg>'
    )

    # ---------- PNG 저장 ----------
    png_file = os.path.join(output_dir, f"{name}.png")
    svg2png(
        bytestring=svg_str.encode("utf-8"),
        write_to=png_file,
        scale=1.0      # 필요 시 해상도 배율 조정
        # output_width=512, output_height=512  # 픽셀 고정 예시
        # dpi=192                              # DPI 고정 예시
    )

    print(f"✅  '{name}' → {png_file} (fill={fill})")

font.close()