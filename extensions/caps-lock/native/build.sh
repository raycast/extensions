#!/bin/sh
set -eu
cd "$(dirname "$0")/.."
build_dir=$(mktemp -d)
trap 'rm -rf "$build_dir"' EXIT
for architecture in arm64 x86_64; do
  xcrun clang -arch "$architecture" -mmacosx-version-min=12.0 -Os -Wall -Wextra -Werror \
    native/caps-lock.c -framework IOKit -o "$build_dir/caps-lock-$architecture"
done
xcrun lipo -create "$build_dir/caps-lock-arm64" "$build_dir/caps-lock-x86_64" -output assets/caps-lock
codesign --force --sign - assets/caps-lock
