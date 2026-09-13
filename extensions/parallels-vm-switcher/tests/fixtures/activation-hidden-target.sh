#!/bin/sh

script=$(cat)

case "$script" in
  *activateWithOptions*)
    printf '%s\n' '{"status":"targeted","windowIdentifier":"window-fedora","windowID":5100}'
    ;;
  *frontmostApplication*)
    printf '%s\n' '{"frontmostPID":4100,"frontmostBundleID":"com.parallels.desktop.console","menuBarOwnerPID":4100,"menuBarOwnerBundleID":"com.parallels.desktop.console","accessibilityTrusted":true,"consoleWindowTitle":"Fedora Linux","consoleWindowIdentifier":"window-fedora","consoleWindowID":5100,"consoleWindowOnscreen":false}'
    ;;
  *)
    printf '%s\n' 'unexpected script' >&2
    exit 64
    ;;
esac
