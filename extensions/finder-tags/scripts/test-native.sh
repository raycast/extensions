#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."
test_directory=$(mktemp -d "${TMPDIR:-/tmp}/finder-tags-test.XXXXXX")
trap 'rm -rf "$test_directory"' EXIT
xcrun swiftc swift/finder-tags/Sources/TagStore.swift swift/finder-tags/Sources/FinderCatalog.swift tests/native/main.swift -o "$test_directory/test-finder-tags"
"$test_directory/test-finder-tags" "$test_directory"
