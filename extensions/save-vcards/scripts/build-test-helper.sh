#!/bin/sh
# Compiles swift/Sources/ContactsCore.swift + test/swift/main.swift into a CLI used by npm test.
set -e
cd "$(dirname "$0")/.."
OUT=.test-build/test-helper
mkdir -p .test-build
if [ -f "$OUT" ] && [ "$OUT" -nt swift/Sources/ContactsCore.swift ] && [ "$OUT" -nt test/swift/main.swift ]; then exit 0; fi
swiftc -O swift/Sources/ContactsCore.swift test/swift/main.swift -o "$OUT"
echo "built $OUT"
