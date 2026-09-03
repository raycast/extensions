#!/bin/zsh
set -euo pipefail

root_dir="${0:A:h:h}"
icon="$root_dir/assets/icon.png"
sips_details="$(/usr/bin/sips -g pixelWidth -g pixelHeight -g hasAlpha "$icon")"
file_details="$(/usr/bin/file -b "$icon")"
if [[ "$sips_details" != *"pixelWidth: 512"* || "$sips_details" != *"pixelHeight: 512"* || "$sips_details" != *"hasAlpha: yes"* ]]; then
  print -u2 "Invalid Store icon dimensions or alpha: $sips_details"
  exit 1
fi
if [[ "$file_details" != *"PNG image data, 512 x 512"* || "$file_details" != *"8-bit/color RGBA"* ]]; then
  print -u2 "Invalid Store icon color format; expected 512x512 8-bit RGBA, got: $file_details"
  exit 1
fi
print -r -- "Store icon valid: 512x512 8-bit RGBA with alpha"
