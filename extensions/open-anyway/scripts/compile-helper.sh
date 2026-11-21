#!/usr/bin/env bash
set -euo pipefail

# compile-helper.sh
# Deterministically compiles src/gatekeeper_helper.swift into a multi-arch Mach-O universal binary
# supporting both Apple Silicon (arm64) and Intel (x86_64) on macOS 13.0+.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

SOURCE_FILE="$PROJECT_ROOT/src/gatekeeper_helper.swift"
OUTPUT_BINARY="$PROJECT_ROOT/assets/gatekeeper-helper"
DEPLOYMENT_TARGET="13.0"

if [ ! -f "$SOURCE_FILE" ]; then
  echo "Error: Swift source file not found at $SOURCE_FILE" >&2
  exit 1
fi

if ! command -v swiftc >/dev/null 2>&1; then
  echo "Error: swiftc compiler is not available on PATH. Ensure Xcode Command Line Tools are installed." >&2
  exit 1
fi

if ! command -v lipo >/dev/null 2>&1; then
  echo "Error: lipo tool is not available on PATH." >&2
  exit 1
fi

BUILD_DIR="$(mktemp -d /tmp/gatekeeper-helper-build.XXXXXX)"
trap 'rm -rf "$BUILD_DIR"' EXIT

ARM64_BIN="$BUILD_DIR/gatekeeper-helper-arm64"
X86_64_BIN="$BUILD_DIR/gatekeeper-helper-x86_64"
UNIVERSAL_TEMP="$BUILD_DIR/gatekeeper-helper-universal"

echo "==> Compiling arm64 slice (target: arm64-apple-macos$DEPLOYMENT_TARGET)..."
swiftc "$SOURCE_FILE" -O -target "arm64-apple-macos$DEPLOYMENT_TARGET" -o "$ARM64_BIN"

echo "==> Compiling x86_64 slice (target: x86_64-apple-macos$DEPLOYMENT_TARGET)..."
swiftc "$SOURCE_FILE" -O -target "x86_64-apple-macos$DEPLOYMENT_TARGET" -o "$X86_64_BIN"

echo "==> Combining slices into universal binary with lipo..."
lipo -create "$ARM64_BIN" "$X86_64_BIN" -output "$UNIVERSAL_TEMP"

# Verify that both architectures are verified before touching the final artifact
ARCH_COUNT=$(lipo -info "$UNIVERSAL_TEMP" | grep -c "arm64" || true)
INTEL_COUNT=$(lipo -info "$UNIVERSAL_TEMP" | grep -c "x86_64" || true)

if [ "$ARCH_COUNT" -lt 1 ] || [ "$INTEL_COUNT" -lt 1 ]; then
  echo "Error: Resulting binary is missing required architectures (arm64 or x86_64)." >&2
  lipo -info "$UNIVERSAL_TEMP" >&2
  exit 1
fi

mkdir -p "$PROJECT_ROOT/assets"
chmod +x "$UNIVERSAL_TEMP"
mv -f "$UNIVERSAL_TEMP" "$OUTPUT_BINARY"

echo "==> Universal binary successfully compiled to assets/gatekeeper-helper:"
file "$OUTPUT_BINARY"
lipo -info "$OUTPUT_BINARY"
