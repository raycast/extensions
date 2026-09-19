#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT="$ROOT_DIR/vendor/lame"
SOURCE_URL="https://downloads.sourceforge.net/project/lame/lame/3.100/lame-3.100.tar.gz"
SOURCE_SHA256="ddfe36cab873794038ae2c1210557ad34857a4b6bdc515785d1da9e175b1da1e"
BUILD_DIR="$(mktemp -d /tmp/meeting-capture-lame.XXXXXX)"
trap '/bin/rm -rf "$BUILD_DIR"' EXIT

/usr/bin/curl -L --fail --silent --show-error "$SOURCE_URL" -o "$BUILD_DIR/lame.tar.gz"
ACTUAL_SHA256="$(/usr/bin/shasum -a 256 "$BUILD_DIR/lame.tar.gz" | /usr/bin/awk '{print $1}')"
if [[ "$ACTUAL_SHA256" != "$SOURCE_SHA256" ]]; then
  echo "LAME source checksum mismatch" >&2
  exit 1
fi

/usr/bin/tar -xzf "$BUILD_DIR/lame.tar.gz" -C "$BUILD_DIR"
for ARCH in arm64 x86_64; do
  /usr/bin/ditto "$BUILD_DIR/lame-3.100" "$BUILD_DIR/source-$ARCH"
  cd "$BUILD_DIR/source-$ARCH"
  CONFIGURE_HOST=""
  if [[ "$ARCH" == "x86_64" ]]; then CONFIGURE_HOST="--host=x86_64-apple-darwin"; fi
  CC="/usr/bin/clang -arch $ARCH" \
    CFLAGS="-O2 -mmacosx-version-min=14.0" \
    LDFLAGS="-arch $ARCH -mmacosx-version-min=14.0" \
    ./configure \
      $CONFIGURE_HOST \
      --disable-shared \
      --enable-static \
      --disable-decoder \
      --prefix="$BUILD_DIR/install-$ARCH"
  /usr/bin/make -j"$(/usr/sbin/sysctl -n hw.logicalcpu)"
  /usr/bin/make install
done
/usr/bin/lipo -create \
  "$BUILD_DIR/install-arm64/bin/lame" \
  "$BUILD_DIR/install-x86_64/bin/lame" \
  -output "$OUTPUT"
/bin/chmod +x "$OUTPUT"
echo "Built universal $OUTPUT from LAME 3.100 ($SOURCE_SHA256)"
