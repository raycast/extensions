#!/bin/sh

script=$(cat)
last_argument=""
for argument in "$@"; do
  last_argument=$argument
done

case "$script" in
  *activateWithOptions*)
    printf '%s\n' 'activated'
    ;;
  *frontmostApplication*)
    printf '{"frontmostPID":%s,"frontmostBundleID":null,"menuBarOwnerPID":%s,"menuBarOwnerBundleID":null,"accessibilityTrusted":true,"consoleWindowTitle":null,"consoleWindowIdentifier":null,"consoleWindowID":null,"consoleWindowOnscreen":false}\n' "$last_argument" "$last_argument"
    ;;
  *)
    printf '%s\n' 'unexpected script' >&2
    exit 64
    ;;
esac
