#!/usr/bin/env bash
set -euo pipefail

mkdir -p assets

if swift build --configuration release --arch arm64 --arch x86_64; then
  cp .build/apple/Products/Release/recognizeText assets/recognizeText
else
  swiftc Sources/recognizeText/main.swift \
    -framework Cocoa \
    -framework Vision \
    -o assets/recognizeText
fi

chmod 755 assets/recognizeText
