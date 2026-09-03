#!/bin/zsh
set -euo pipefail

root_dir="${0:A:h:h}"
cd "$root_dir/native/MouseScrollHelper"
scratch_dir="$(mktemp -d "${TMPDIR:-/tmp}/mouse-scroll-helper-build.XXXXXX")"
trap 'rm -rf "$scratch_dir"' EXIT
export CLANG_MODULE_CACHE_PATH="$scratch_dir/clang-cache"
export SWIFTPM_MODULECACHE_OVERRIDE="$scratch_dir/clang-cache"
build_arch() {
  local architecture="$1"
  local triple="$2"
  local output_binary="$3"
  local architecture_scratch="$scratch_dir/$architecture"
  swift build --disable-sandbox -c release --product mouse-scroll-helper --triple "$triple" --scratch-path "$architecture_scratch/build" -debug-info-format none >&2
  if [[ ! -x "$output_binary" ]]; then
    print -u2 "Universal helper build failed: missing $architecture binary at $output_binary"
    exit 1
  fi
  local observed
  observed="$(/usr/bin/lipo -archs "$output_binary")"
  if [[ "$observed" != *"$architecture"* ]]; then
    print -u2 "Universal helper build failed: expected $architecture slice, got: $observed"
    exit 1
  fi
}

# Build both macOS slices; fail closed if the local Xcode toolchain cannot cross-compile.
arm64_binary="$scratch_dir/arm64/build/out/Products/Release/mouse-scroll-helper"
x86_64_binary="$scratch_dir/x86_64/build/out/Products/Release/mouse-scroll-helper"
build_arch arm64 arm64-apple-macosx13.0 "$arm64_binary"
build_arch x86_64 x86_64-apple-macosx13.0 "$x86_64_binary"
universal_binary="$scratch_dir/mouse-scroll-helper-universal"
/usr/bin/lipo -create -output "$universal_binary" "$arm64_binary" "$x86_64_binary"
architectures="$(/usr/bin/lipo -archs "$universal_binary")"
if [[ "$architectures" != *"arm64"* || "$architectures" != *"x86_64"* ]]; then
  print -u2 "Universal helper build failed: expected arm64 and x86_64 slices, got: $architectures"
  exit 1
fi
mkdir -p "$root_dir/assets/bin"
cp "$universal_binary" "$root_dir/assets/bin/mouse-scroll-helper"
chmod 755 "$root_dir/assets/bin/mouse-scroll-helper"
