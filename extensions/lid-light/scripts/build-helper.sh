#!/bin/bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
package="$root/native"
app="$root/assets/Lid Light Helper.app"
export CLANG_MODULE_CACHE_PATH="$package/.build/clang-module-cache"

swift build --package-path "$package" -c release --arch arm64 --disable-sandbox
binary_dir="$(swift build --package-path "$package" -c release --arch arm64 --show-bin-path)"
staging="$(mktemp -d "$package/.build/lid-light.XXXXXX")"
trap 'rm -rf "$staging"' EXIT
bundle="$staging/Lid Light Helper.app"
mkdir -p "$bundle/Contents/MacOS"
cp -X "$package/Info.plist" "$bundle/Contents/Info.plist"
cp -X "$binary_dir/LidLightHelper" "$bundle/Contents/MacOS/LidLightHelper"
/usr/bin/codesign --force --sign - "$bundle"
/usr/bin/codesign --verify --strict "$bundle"

rm -rf "$app"
mv "$bundle" "$app"
