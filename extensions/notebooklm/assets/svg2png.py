from cairosvg import svg2png
import os

SVG_PATH = "./icon.svg"   # 원본 SVG
PNG_PATH = "./icon.png"   # 결과 PNG

# ----- 변환 -----
# scale=1.0  → 그대로
# 예) scale=2.0 은 가로·세로 2배
# output_width / output_height / dpi 중 하나로도 해상도 지정 가능
svg2png(
    url=SVG_PATH,           # 파일 경로를 바로 url 인자로 줘도 됨
    write_to=PNG_PATH,
    output_width=512,
    output_height=512
)

print(f"✅  Saved: {os.path.abspath(PNG_PATH)}")