#!/bin/sh

script=$(cat)
state_root=${TMPDIR:-/tmp}
activation_path="${state_root%/}/parallels-persistent-source-${PPID}.activation"

read_count() {
  if [ -f "$1" ]; then
    read -r value < "$1"
    printf '%s' "$value"
  else
    printf '0'
  fi
}

case "$script" in
  *activateWithOptions*)
    activation_count=$(read_count "$activation_path")
    activation_count=$((activation_count + 1))
    printf '%s\n' "$activation_count" > "$activation_path"
    printf '%s\n' 'activated'
    ;;
  *frontmostApplication*)
    printf '%s\n' '{"frontmostPID":4300,"frontmostBundleID":"com.mitchellh.ghostty","menuBarOwnerPID":4300,"menuBarOwnerBundleID":"com.mitchellh.ghostty","accessibilityTrusted":true,"consoleWindowTitle":null,"consoleWindowIdentifier":null,"consoleWindowID":null,"consoleWindowOnscreen":false}'
    ;;
  *)
    printf '%s\n' 'unexpected script' >&2
    exit 64
    ;;
esac
