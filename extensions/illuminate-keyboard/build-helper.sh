#!/bin/bash
set -e

cd "$(dirname "$0")/swift"

echo "Building universal binary (arm64 + x86_64)..."
swift build -c release --arch arm64 --arch x86_64

echo "Copying binary to assets/"
cp .build/apple/Products/Release/keyboard ../assets/keyboard

echo "Verifying binary architectures:"
file ../assets/keyboard

echo "Done."
