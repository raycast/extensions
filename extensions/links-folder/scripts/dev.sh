#!/bin/zsh
# This project lives inside iCloud Drive. While iCloud syncs node_modules, or
# after it evicts the files ("Optimize Mac Storage"), Node's reads block on
# iCloud and `ray develop` hangs.
#
# Fix: iCloud never syncs items whose name ends in ".nosync". node_modules
# really lives at deps.nosync/node_modules and "node_modules" is a relative
# symlink to it. The symlink syncs, so on another Mac the script recreates the
# missing directory and reinstalls.

set -euo pipefail

cd "$(dirname "$0")/.."

TARGET=deps.nosync/node_modules

# Drop iCloud conflict copies ("node_modules 2", ...)
setopt null_glob
rm -rf node_modules\ [0-9]*

if [ -L node_modules ]; then
  [ "$(readlink node_modules)" = "$TARGET" ] || { rm node_modules; ln -s "$TARGET" node_modules; }
elif [ -d node_modules ]; then
  # Move the real folder into place, no reinstall
  rm -rf "$TARGET"
  mkdir -p deps.nosync
  mv node_modules "$TARGET"
  ln -s "$TARGET" node_modules
else
  ln -s "$TARGET" node_modules
fi
mkdir -p "$TARGET"

[ -x node_modules/.bin/ray ] || npm install

exec node_modules/.bin/ray develop
