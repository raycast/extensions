#!/bin/bash
# Apply the embedding-memory patch before trusting a build cache.
set -euo pipefail
SOURCE=$1
PATCH=$2
if git -C "$SOURCE" apply --check "$PATCH" 2>/dev/null; then
  git -C "$SOURCE" apply "$PATCH"
elif git -C "$SOURCE" apply --reverse --check "$PATCH" 2>/dev/null; then
  # A reverse check proves it is already applied; a forward failure alone proves nothing.
  exit 0
else
  echo "Required llama.cpp memory patch is incompatible with the source tree" >&2
  exit 1
fi
