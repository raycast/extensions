#!/bin/sh
set -eu

. "$(dirname "$0")/layout.sh"

CONFIGURATION="${1:-release}"

native_source_signature() {
  (
    cd "$SWIFT_PACKAGE_DIR"
    find . \
      -type f \
      ! -name ".DS_Store" \
      ! -name "README.md" \
      ! -path "./.build/*" \
      ! -path "./.swiftpm/*" \
      -print |
      LC_ALL=C sort |
      while IFS= read -r file; do
        shasum -a 256 "$file"
      done |
      shasum -a 256 |
      awk '{ print $1 }'
  )
}

case "$CONFIGURATION" in
  debug|release)
    ;;
  *)
    printf "Usage: %s [debug|release]\n" "$0" >&2
    exit 2
    ;;
esac

"$SCRIPT_DIR/sync-native.sh"
"$SCRIPT_DIR/verify-native.sh"

case "$CONFIGURATION" in
  debug)
    PRODUCT_CONFIGURATION="Debug"
    CONFIGURATION_SIGNATURE_FILE="$SCRATCH_DIR/debug-source.sha256"
    ;;
  release)
    PRODUCT_CONFIGURATION="Release"
    CONFIGURATION_SIGNATURE_FILE="$SIGNATURE_FILE"
    ;;
esac

PRODUCT_BIN="$SCRATCH_DIR/apple/Products/$PRODUCT_CONFIGURATION/fp-progress"
SOURCE_SIGNATURE="$(native_source_signature)"

if [ "$CONFIGURATION" = "release" ] &&
  [ -f "$SIGNATURE_FILE" ] &&
  [ -x "$OUTPUT_BIN" ] &&
  [ "$(cat "$SIGNATURE_FILE")" = "$SOURCE_SIGNATURE" ] &&
  lipo "$OUTPUT_BIN" -verify_arch arm64 x86_64 >/dev/null 2>&1; then
  printf "Bundled release helper is up to date at %s\n" "$OUTPUT_BIN"
  exit 0
fi

if [ "$CONFIGURATION" = "debug" ] &&
  [ -f "$CONFIGURATION_SIGNATURE_FILE" ] &&
  [ -x "$PRODUCT_BIN" ] &&
  [ "$(cat "$CONFIGURATION_SIGNATURE_FILE")" = "$SOURCE_SIGNATURE" ] &&
  lipo "$PRODUCT_BIN" -verify_arch arm64 x86_64 >/dev/null 2>&1; then
  printf "Swift debug helper is up to date at %s\n" "$PRODUCT_BIN"
  exit 0
fi

swift build --package-path "$SWIFT_PACKAGE_DIR" --scratch-path "$SCRATCH_DIR" -c "$CONFIGURATION" --arch arm64 --arch x86_64
lipo "$PRODUCT_BIN" -verify_arch arm64 x86_64
mkdir -p "$(dirname "$CONFIGURATION_SIGNATURE_FILE")"
printf "%s\n" "$SOURCE_SIGNATURE" > "$CONFIGURATION_SIGNATURE_FILE"

if [ "$CONFIGURATION" = "debug" ]; then
  printf "Built universal debug helper at %s\n" "$PRODUCT_BIN"
  exit 0
fi

mkdir -p "$OUTPUT_DIR"
if cmp -s "$PRODUCT_BIN" "$OUTPUT_BIN"; then
  printf "Bundled release helper is unchanged at %s\n" "$OUTPUT_BIN"
else
  cp "$PRODUCT_BIN" "$OUTPUT_BIN"
  chmod +x "$OUTPUT_BIN"
  printf "Bundled universal release build at %s\n" "$OUTPUT_BIN"
fi
