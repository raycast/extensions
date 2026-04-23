#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT_DIR="$ROOT/metadata"
BACKGROUND_SOURCE="$ROOT/docs/screenshots-drafts/dashboard-profile-defaults.png"

mkdir -p "$OUT_DIR"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ffmpeg is required to generate metadata screenshots." >&2
  exit 1
fi

if [[ ! -f "$BACKGROUND_SOURCE" ]]; then
  echo "Missing background source: $BACKGROUND_SOURCE" >&2
  exit 1
fi

generate_shot() {
  local source_path="$1"
  local output_path="$2"
  local source_filter="${3:-}"
  local max_width="${4:-1680}"
  local max_height="${5:-1050}"

  if [[ ! -f "$source_path" ]]; then
    echo "Missing source screenshot: $source_path" >&2
    exit 1
  fi

  local source_chain="scale=${max_width}:${max_height}:force_original_aspect_ratio=decrease"
  if [[ -n "$source_filter" ]]; then
    source_chain="${source_filter},${source_chain}"
  fi

  ffmpeg -y -loglevel error \
    -i "$BACKGROUND_SOURCE" \
    -i "$source_path" \
    -filter_complex "\
[0:v]scale=2000:1250:force_original_aspect_ratio=increase,crop=2000:1250,boxblur=40:12,eq=brightness=-0.08:saturation=1.06[bg]; \
[1:v]${source_chain},unsharp=5:5:0.5:5:5:0.0,format=rgba[fg]; \
[fg]split=2[fg_main][fg_shadow_source]; \
[fg_shadow_source]pad=iw+28:ih+28:14:14:color=white@0.08,format=rgba,colorchannelmixer=aa=0.26,boxblur=28:12[shadow]; \
[bg][shadow]overlay=(W-w)/2:(H-h)/2+20[with_shadow]; \
[with_shadow][fg_main]overlay=(W-w)/2:(H-h)/2[out]" \
    -map "[out]" \
    -frames:v 1 \
    "$output_path"
}

generate_shot \
  "$ROOT/docs/screenshots-drafts/dashboard-profile-defaults.png" \
  "$OUT_DIR/dashboard-command-center.png"

generate_shot \
  "$ROOT/docs/screenshots-drafts/engine-console-biorhythm.png" \
  "$OUT_DIR/engine-console-biorhythm.png"

generate_shot \
  "$ROOT/docs/screenshots-drafts/dashboard-profile-defaults.png" \
  "$OUT_DIR/profile-defaults.png" \
  "" \
  "1760" \
  "1100"

echo "Generated metadata screenshots in $OUT_DIR"
