#!/bin/sh

script=$(cat)
state_root=${TMPDIR:-/tmp}
state_path="${state_root%/}/parallels-reclaimed-${PPID}"
activation_path="${state_path}.activation"
focus_path="${state_path}.focus"

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
    printf '%s\n' '{"status":"targeted","windowIdentifier":"window-fedora","windowID":5100}'
    ;;
  *frontmostApplication*)
    activation_count=$(read_count "$activation_path")
    focus_count=$(read_count "$focus_path")
    focus_count=$((focus_count + 1))
    printf '%s\n' "$focus_count" > "$focus_path"
    if [ "$activation_count" -eq 0 ] || { [ "$activation_count" -eq 1 ] && [ "$focus_count" -gt 4 ]; }; then
      printf '%s\n' '{"frontmostPID":4200,"frontmostBundleID":"com.raycast.macos","menuBarOwnerPID":4200,"menuBarOwnerBundleID":"com.raycast.macos","accessibilityTrusted":true,"consoleWindowTitle":null,"consoleWindowIdentifier":null,"consoleWindowID":null,"consoleWindowOnscreen":false}'
    else
      printf '%s\n' '{"frontmostPID":4100,"frontmostBundleID":"com.parallels.desktop.console","menuBarOwnerPID":4100,"menuBarOwnerBundleID":"com.parallels.desktop.console","accessibilityTrusted":true,"consoleWindowTitle":"Fedora Linux","consoleWindowIdentifier":"window-fedora","consoleWindowID":5100,"consoleWindowOnscreen":true}'
    fi
    ;;
  *)
    printf '%s\n' 'unexpected script' >&2
    exit 64
    ;;
esac
