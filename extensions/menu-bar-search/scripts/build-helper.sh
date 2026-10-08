#!/bin/sh
# Build menubarctl as a universal binary so the packaged extension runs on Apple Silicon and Intel Macs.
set -eu

cd "$(dirname "$0")/.."
mkdir -p assets .build/module-cache .build/helper
export CLANG_MODULE_CACHE_PATH=.build/module-cache

for arch in arm64 x86_64; do
  swiftc -target "$arch-apple-macos13" helper/menubarctl.swift -o ".build/helper/menubarctl-$arch"
done

lipo -create .build/helper/menubarctl-arm64 .build/helper/menubarctl-x86_64 -output assets/menubarctl
