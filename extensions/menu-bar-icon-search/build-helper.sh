#!/bin/zsh
set -euo pipefail
cd "${0:A:h}"
mkdir -p assets
for arch in arm64 x86_64; do
  mkdir -p ".build/module-cache-$arch"
  swiftc -O -target "$arch-apple-macosx13.0" \
    -module-cache-path ".build/module-cache-$arch" \
    -o ".build/menubar-helper-$arch" swift/MenuBarHelper.swift \
    -framework AppKit -framework ApplicationServices
done
lipo -create .build/menubar-helper-arm64 .build/menubar-helper-x86_64 \
  -output assets/menubar-helper
chmod +x assets/menubar-helper
