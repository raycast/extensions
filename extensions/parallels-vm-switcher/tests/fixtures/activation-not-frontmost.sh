#!/bin/sh

script=$(cat)

case "$script" in
  *activateWithOptions*)
    printf '%s\n' '{"status":"targeted","windowIdentifier":"window-fedora","windowID":5100}'
    ;;
  *frontmostApplication*)
    # Activation was accepted, but Parallels still shows a different VM.
    printf '%s\n' '{"frontmostPID":4100,"frontmostBundleID":"com.parallels.desktop.console","menuBarOwnerPID":4100,"menuBarOwnerBundleID":"com.parallels.desktop.console","accessibilityTrusted":true,"consoleWindowTitle":"Other VM","consoleWindowIdentifier":"window-other","consoleWindowID":5200,"consoleWindowOnscreen":true}'
    ;;
  *)
    printf '%s\n' 'unexpected script' >&2
    exit 64
    ;;
esac
