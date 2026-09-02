#!/bin/sh

script=$(cat)
state_root=${TMPDIR:-/tmp}
activation_path="${state_root%/}/parallels-source-frontmost-${PPID}.activation"

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
    if [ "$activation_count" -eq 1 ]; then
      printf '%s\n' 'activated'
    else
      printf '%s\n' '{"status":"targeted","windowIdentifier":"window-fedora","windowID":5100}'
    fi
    ;;
  *frontmostApplication*)
    activation_count=$(read_count "$activation_path")
    if [ "$activation_count" -lt 2 ]; then
      printf '%s\n' '{"frontmostPID":4300,"frontmostBundleID":"com.mitchellh.ghostty","menuBarOwnerPID":4300,"menuBarOwnerBundleID":"com.mitchellh.ghostty","accessibilityTrusted":true,"consoleWindowTitle":null,"consoleWindowIdentifier":null,"consoleWindowID":null,"consoleWindowOnscreen":false}'
    else
      printf '%s\n' '{"frontmostPID":4100,"frontmostBundleID":"com.parallels.desktop.console","menuBarOwnerPID":4100,"menuBarOwnerBundleID":"com.parallels.desktop.console","accessibilityTrusted":true,"consoleWindowTitle":"Fedora Linux","consoleWindowIdentifier":"window-fedora","consoleWindowID":5100,"consoleWindowOnscreen":true}'
    fi
    ;;
  *)
    printf '%s\n' 'unexpected script' >&2
    exit 64
    ;;
esac
