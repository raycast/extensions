#!/bin/bash
# Exports the 4 macOS icon style previews (Default, Dark, Clear, Tinted)
# by switching the system icon appearance, flushing the icon cache,
# and capturing the Weather app icon in each style.
#
# Usage: ./export-icon-styles.sh
#
# Output: ../assets/icon-style-{default,dark,clear,tinted}.png (1024x1024)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
ASSETS_DIR="$SCRIPT_DIR/../assets"
BUILD_DIR=$(mktemp -d)

trap 'rm -rf "$BUILD_DIR"' EXIT

echo "==> Compiling helpers…"
clang -framework Foundation -framework AppKit -ldl -fobjc-arc \
  -o "$BUILD_DIR/set_icon_style" "$SCRIPT_DIR/set_icon_style.m"
clang -framework AppKit -framework Foundation -fobjc-arc \
  -o "$BUILD_DIR/capture_icon" "$SCRIPT_DIR/capture_icon.m"

# Save current icon config so we can restore it
ORIGINAL_THEME=$(defaults read -g AppleIconAppearanceTheme 2>/dev/null || echo "")
echo "==> Current icon theme: '${ORIGINAL_THEME:-<default>}'"

# iconAppearanceTheme values:
#   1 = Default (colorful, light bg)
#   0 = Dark (colorful, dark bg)
#   3 = Clear Dark (gray glass)
#   6 = Tinted Dark (blue monochrome)
declare -A STYLES=(
  [default]=1
  [dark]=0
  [clear]=3
  [tinted]=6
)

for style in default dark clear tinted; do
  iat=${STYLES[$style]}
  echo "==> Rendering '$style' (IAT=$iat)…"

  "$BUILD_DIR/set_icon_style" "$iat"
  killall iconservicesagent 2>/dev/null || true
  sleep 1

  # Run capture in a fresh process to avoid NSWorkspace icon caching
  "$BUILD_DIR/capture_icon" "$ASSETS_DIR/icon-style-${style}.png"
done

# Restore original icon appearance
echo "==> Restoring original theme…"
if [ -z "$ORIGINAL_THEME" ]; then
  defaults delete -g AppleIconAppearanceTheme 2>/dev/null || true
else
  defaults write -g AppleIconAppearanceTheme "$ORIGINAL_THEME"
fi
killall iconservicesagent 2>/dev/null || true

echo "==> Done! Exported to $ASSETS_DIR/"
ls -la "$ASSETS_DIR"/icon-style-*.png
