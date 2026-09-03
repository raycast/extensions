#!/bin/zsh
set -euo pipefail

root_dir="${0:A:h:h}"
helper="$root_dir/assets/bin/mouse-scroll-helper"
identity="${MOUSE_SCROLL_PER_DEVICE_DEVELOPER_ID:-}"
if [[ -z "$identity" ]]; then
  print -u2 "Store release signing blocked: set MOUSE_SCROLL_PER_DEVICE_DEVELOPER_ID to an explicit Developer ID Application identity."
  exit 2
fi
if [[ "$identity" != Developer\ ID\ Application:* ]]; then
  print -u2 "Store release signing blocked: Apple Development and ad-hoc identities are not public-release authorities."
  exit 2
fi
if [[ ! -f "$helper" ]] || [[ "$(/usr/bin/lipo -archs "$helper")" != *"arm64"* || "$(/usr/bin/lipo -archs "$helper")" != *"x86_64"* ]]; then
  print -u2 "Store release signing blocked: expected universal arm64+x86_64 helper is missing."
  exit 1
fi

"$root_dir/scripts/stage-store-release-artifact.sh" \
  "$helper" \
  "$root_dir/scripts/codesign-store-release-candidate.sh" \
  "$root_dir/scripts/verify-store-release-signing.sh" \
  "$identity"
print -r -- "Store release helper signing verified. Notarization remains a separate release gate."
