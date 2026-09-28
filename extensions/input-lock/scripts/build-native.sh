#!/bin/sh
set -eu

mkdir -p .build assets
swiftc -O -target arm64-apple-macosx13.0 native/InputLock.swift -o .build/input-lock-arm64
swiftc -O -target x86_64-apple-macosx13.0 native/InputLock.swift -o .build/input-lock-x86_64
lipo -create .build/input-lock-arm64 .build/input-lock-x86_64 -output assets/input-lock
codesign --force --sign - assets/input-lock
codesign --verify --strict assets/input-lock
