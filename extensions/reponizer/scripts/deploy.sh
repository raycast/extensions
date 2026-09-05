#!/usr/bin/env bash
# Deploy the extension from the devcontainer onto the Mac's Raycast extensions
# dir (~/.config/raycast/extensions is a virtiofs bind mount of the Mac host).
#
# ray must never write to the mount directly: virtiofs sporadically corrupts
# in-flight file creates, leaving 0-byte "phantom" files that ls still shows
# but stat/rm cannot reach — the next build then dies with EACCES. So we build
# to a container-local dir and copy the result over, tolerating phantoms:
# a directory that refuses rm -rf is parked aside instead of failing the run.
set -euo pipefail

ext="$HOME/.config/raycast/extensions/reponizer"
staging=/tmp/reponizer-deploy

rm -rf "$staging"
ray build -e dist -o "$staging"

# Opportunistically clean parked dirs from earlier runs; they may still resist.
rm -rf "$ext".trash-* 2>/dev/null || true

if [ -e "$ext" ] && ! rm -rf "$ext" 2>/dev/null; then
  parked="$ext.trash-$(date +%s)"
  mv "$ext" "$parked"
  # Without a package.json Raycast ignores the parked copy.
  rm -f "$parked/package.json" 2>/dev/null || true
fi

# The copy itself can trip over the same virtiofs hiccup — retry once.
if ! cp -R "$staging" "$ext"; then
  echo "copy failed, retrying once…" >&2
  rm -rf "$ext" 2>/dev/null || true
  cp -R "$staging" "$ext"
fi

echo "Deployed to $ext"
