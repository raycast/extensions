#!/bin/bash
set -euo pipefail

project_root="$(cd "$(dirname "$0")/.." && pwd)"
source_file="$project_root/native/DeskBLE.swift"
info_plist="$project_root/native/Info.plist"
output_file="$project_root/assets/deskctl"
build_directory="$project_root/.raycast-swift-build"
sdk_path="$(xcrun --sdk macosx --show-sdk-path)"

mkdir -p "$build_directory"

build_architecture() {
  local architecture="$1"
  local architecture_output="$build_directory/deskctl-$architecture"

  xcrun swiftc \
    -O \
    -target "$architecture-apple-macosx13.0" \
    -sdk "$sdk_path" \
    -framework CoreBluetooth \
    -Xlinker -sectcreate \
    -Xlinker __TEXT \
    -Xlinker __info_plist \
    -Xlinker "$info_plist" \
    "$source_file" \
    -o "$architecture_output"
}

build_architecture arm64
build_architecture x86_64
xcrun lipo -create "$build_directory/deskctl-arm64" "$build_directory/deskctl-x86_64" -output "$output_file"
codesign --force --sign - --identifier com.cristian.raycast-standing-desk-helper "$output_file" >/dev/null
chmod +x "$output_file"
