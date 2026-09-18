#!/bin/zsh
set -euo pipefail
cd "${0:A:h}"
mkdir -p assets
mkdir -p .build/module-cache
swiftc -O -module-cache-path .build/module-cache -o assets/menubar-helper swift/MenuBarHelper.swift \
  -framework AppKit -framework ApplicationServices
chmod +x assets/menubar-helper
