#!/bin/zsh
set -euo pipefail

root_dir="${0:A:h:h}"
cd "$root_dir/native/MouseScrollHelper"
scratch_dir="$(mktemp -d "${TMPDIR:-/tmp}/mouse-scroll-helper-test.XXXXXX")"
trap 'rm -rf "$scratch_dir"' EXIT
export CLANG_MODULE_CACHE_PATH="$scratch_dir/clang-cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$scratch_dir/clang-cache"
swift test --disable-sandbox --scratch-path "$scratch_dir/build"
