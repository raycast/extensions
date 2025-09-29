#!/usr/bin/env bash
set -euo pipefail

# Generate multiple PNG sizes from assets/liverpool-crest.png using macOS sips

BASE="assets/liverpool-crest.png"
if [[ ! -f "$BASE" ]]; then
  echo "Missing $BASE. Please place your source PNG there first." >&2
  exit 1
fi

SIZES=(16 24 32 48 64 72 96 128 144)
for SZ in "${SIZES[@]}"; do
  OUT="assets/liverpool-crest-${SZ}.png"
  echo "Generating $OUT ..."
  sips -s format png -Z "$SZ" "$BASE" --out "$OUT" >/dev/null
done

echo "Done. Generated sizes: ${SIZES[*]} px"
