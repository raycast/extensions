#!/bin/sh

set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
project_dir=$(dirname "$script_dir")
source_file="$project_dir/helpers/translation-toast.swift"
output_file="$project_dir/assets/translation-toast"
build_dir=$(mktemp -d)

cleanup() {
  rm -rf "$build_dir"
}
trap cleanup EXIT INT TERM

swiftc -O -target arm64-apple-macosx13.0 "$source_file" -o "$build_dir/translation-toast-arm64"
swiftc -O -target x86_64-apple-macosx13.0 "$source_file" -o "$build_dir/translation-toast-x86_64"
lipo -create \
  "$build_dir/translation-toast-arm64" \
  "$build_dir/translation-toast-x86_64" \
  -output "$output_file"
chmod +x "$output_file"
lipo -info "$output_file"
