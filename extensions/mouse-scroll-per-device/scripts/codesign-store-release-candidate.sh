#!/bin/zsh
set -euo pipefail

if (( $# != 2 )); then
  print -u2 "usage: $0 <temporary-helper> <Developer ID Application identity>"
  exit 64
fi

helper="$1"
identity="$2"
/usr/bin/codesign --force --timestamp --options runtime --sign "$identity" \
  --identifier "com.brandon.mouse-scroll-per-device.helper" "$helper"
