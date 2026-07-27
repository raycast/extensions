#!/bin/sh
set -eu

project_dir=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
source_file="$project_dir/native/DimmerHelper.swift"
output_file="$project_dir/assets/dimmer-helper"
build_dir=$(mktemp -d)

cleanup() {
  rm -r "$build_dir"
}
trap cleanup EXIT INT TERM

mkdir -p "$project_dir/assets"

xcrun swiftc \
  -O \
  -whole-module-optimization \
  -parse-as-library \
  -target arm64-apple-macosx13.0 \
  "$source_file" \
  -o "$build_dir/dimmer-helper-arm64"

xcrun swiftc \
  -O \
  -whole-module-optimization \
  -parse-as-library \
  -target x86_64-apple-macosx13.0 \
  "$source_file" \
  -o "$build_dir/dimmer-helper-x86_64"

xcrun lipo -create \
  "$build_dir/dimmer-helper-arm64" \
  "$build_dir/dimmer-helper-x86_64" \
  -output "$output_file"

chmod 755 "$output_file"
codesign --force --sign - "$output_file"

echo "Built universal helper: $output_file"
