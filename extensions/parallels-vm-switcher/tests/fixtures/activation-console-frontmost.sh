#!/bin/sh

script=$(cat)
state_root=${TMPDIR:-/tmp}
activation_path="${state_root%/}/parallels-console-frontmost-${PPID}.activation"

case "$script" in
  *activateWithOptions*)
    printf '%s\n' '1' > "$activation_path"
    printf '%s\n' '{"status":"targeted","windowIdentifier":"window-fedora","windowID":5100}'
    ;;
  *frontmostApplication*)
    case "$script" in
      *CGWindowListCopyWindowInfo*optionOnScreenOnly*) ;;
      *)
        printf '%s\n' 'focus-state script must query the onscreen-only CoreGraphics window list' >&2
        exit 65
        ;;
    esac
    if [ -f "$activation_path" ]; then
      printf '%s\n' '{"frontmostPID":4100,"frontmostBundleID":"com.parallels.desktop.console","menuBarOwnerPID":4100,"menuBarOwnerBundleID":"com.parallels.desktop.console","accessibilityTrusted":true,"consoleWindowTitle":"Fedora Linux","consoleWindowIdentifier":"window-fedora","consoleWindowID":5100,"consoleWindowOnscreen":true}'
    else
      printf '%s\n' '{"frontmostPID":4200,"frontmostBundleID":"com.example.source","menuBarOwnerPID":4200,"menuBarOwnerBundleID":"com.example.source","accessibilityTrusted":true,"consoleWindowTitle":null,"consoleWindowIdentifier":null,"consoleWindowID":null,"consoleWindowOnscreen":false}'
    fi
    ;;
  *)
    printf '%s\n' 'unexpected script' >&2
    exit 64
    ;;
esac
