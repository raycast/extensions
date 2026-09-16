#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
mkdir -p assets
build_dir=$(mktemp -d "${TMPDIR:-/tmp}/resource-inspector-build.XXXXXX")
trap 'rm -rf "$build_dir"' EXIT HUP INT TERM
for architecture in arm64 x86_64; do
  /usr/bin/swiftc -O -target "${architecture}-apple-macosx13.0" \
    -module-cache-path "${TMPDIR:-/tmp}/resource-inspector-swift-cache-${architecture}" \
    native/Inspector.swift -o "$build_dir/inspector-${architecture}"
done
/usr/bin/lipo -create "$build_dir/inspector-arm64" "$build_dir/inspector-x86_64" -output assets/inspector
/usr/bin/codesign --force --sign - assets/inspector
