#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

OUT="${1:-../assets/ScreenCleaner}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

SDK="$(xcrun --sdk macosx --show-sdk-path)"
TARGET_MIN="12.0"
ARCHS=()

build_arch() {
  local arch="$1"
  echo "Building ScreenCleaner for ${arch}..."
  xcrun swiftc \
    -O \
    -whole-module-optimization \
    -sdk "$SDK" \
    -target "${arch}-apple-macos${TARGET_MIN}" \
    -o "${TMP_DIR}/${arch}" \
    main.swift
}

for arch in arm64 x86_64; do
  if build_arch "$arch"; then
    ARCHS+=("$arch")
  else
    echo "warning: failed to build for ${arch}" >&2
  fi
done

if [[ ${#ARCHS[@]} -eq 0 ]]; then
  echo "error: no architectures were built" >&2
  exit 1
fi

mkdir -p "$(dirname "$OUT")"

if [[ ${#ARCHS[@]} -eq 2 ]]; then
  xcrun lipo -create -output "$OUT" "${TMP_DIR}/arm64" "${TMP_DIR}/x86_64"
else
  cp "${TMP_DIR}/${ARCHS[0]}" "$OUT"
fi

chmod 755 "$OUT"
codesign --force --sign - --timestamp=none "$OUT" >/dev/null 2>&1 || \
  echo "warning: ad-hoc codesign failed; the helper may need to be re-authorized" >&2

echo "Built ${OUT} ($(lipo -archs "$OUT" 2>/dev/null || echo "${ARCHS[*]}"))"
