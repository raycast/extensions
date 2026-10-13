#!/bin/sh
# Fails when a tracked text file contains non-ASCII characters (smart quotes,
# em dashes, ellipsis characters, emoji). Binary assets and the lockfile are skipped.
set -eu

files=$(git ls-files | grep -v -e '\.png$' -e '\.gif$' -e '^package-lock\.json$')
# shellcheck disable=SC2086
if LC_ALL=C grep -n '[^[:print:][:space:]]' $files; then
  echo "Non-ASCII characters found (see above). Use plain ASCII." >&2
  exit 1
fi
