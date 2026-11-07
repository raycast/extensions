#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

OUT="${1:-../assets/ScreenCleaner}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

SDK="$(xcrun --sdk macosx --show-sdk-path)"
TARGET_MIN="12.0"

build_arch() {
  local arch="$1"
  echo "Building ScreenCleaner for ${arch}..."
  if ! xcrun swiftc \
    -O \
    -whole-module-optimization \
    -sdk "$SDK" \
    -target "${arch}-apple-macos${TARGET_MIN}" \
    -o "${TMP_DIR}/${arch}" \
    main.swift; then
    echo "error: failed to build for ${arch}; refusing to replace ${OUT}" >&2
    exit 1
  fi
}

# Both architectures are required. A single-arch build must never replace the
# universal helper that ships with the extension.
build_arch arm64
build_arch x86_64

UNIVERSAL="${TMP_DIR}/ScreenCleaner"
xcrun lipo -create -output "$UNIVERSAL" "${TMP_DIR}/arm64" "${TMP_DIR}/x86_64"

mkdir -p "$(dirname "$OUT")"
cp "$UNIVERSAL" "$OUT"
chmod 755 "$OUT"
codesign --force --sign - --timestamp=none "$OUT" >/dev/null 2>&1 || \
  echo "warning: ad-hoc codesign failed; the helper may need to be re-authorized" >&2

echo "Built ${OUT} ($(lipo -archs "$OUT"))"
