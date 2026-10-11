#!/usr/bin/env bash
set -euo pipefail
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "The helper requires macOS and Xcode Command Line Tools." >&2
  exit 1
fi
cd "$(dirname "$0")/.."
app_path="${1:-assets/QuickDropcastBridge.app}"
build_mode="${2:-host}"
if [[ "$build_mode" != host && "$build_mode" != universal ]]; then
  echo "Usage: build-native.sh [output-app] [host|universal]" >&2
  exit 1
fi
mkdir -p "$app_path/Contents/MacOS"
cp native/Info.plist "$app_path/Contents/Info.plist"
minimum_macos=$(/usr/libexec/PlistBuddy -c "Print :LSMinimumSystemVersion" native/Info.plist)
build_temp=$(mktemp -d)
trap 'rm -rf "$build_temp"' EXIT
architectures=("$(uname -m)")
if [[ "$build_mode" == universal ]]; then
  architectures=(arm64 x86_64)
fi
for architecture in "${architectures[@]}"; do
  xcrun swiftc -module-cache-path "$build_temp/modules" -target "${architecture}-apple-macosx${minimum_macos}" -swift-version 5 -O -framework AppKit native/main.swift -o "$build_temp/$architecture"
done
if [[ "$build_mode" == universal ]]; then
  xcrun lipo -create "$build_temp/arm64" "$build_temp/x86_64" -output "$app_path/Contents/MacOS/QuickDropcastBridge"
else
  cp "$build_temp/${architectures[0]}" "$app_path/Contents/MacOS/QuickDropcastBridge"
fi
for architecture in "${architectures[@]}"; do
  xcrun lipo "$app_path/Contents/MacOS/QuickDropcastBridge" -verify_arch "$architecture"
done
codesign --force --sign - "$app_path"
codesign --verify --strict "$app_path"
