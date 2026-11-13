#!/bin/zsh
# @raycast.schemaVersion 1
# @raycast.title Capture and Copy
# @raycast.mode silent
# @raycast.icon 📸
# @raycast.description Capture and copy; repeat your hotkey while holding its modifiers to add older screenshots.
# @raycast.packageName Screenshots

set -eu
base="$HOME/Library/Application Support/Capture and Copy"
folder=$(/usr/bin/defaults read com.apple.screencapture location 2>/dev/null) || folder="$HOME/Desktop"
folder="${folder/#\~/$HOME}"
# Return to Raycast immediately so the next press can reach the active session.
# The helper exits after the copied confirmation; no persistent background app is installed.
/usr/bin/nohup "$base/capture-batch" "$folder" >> "$base/batch.log" 2>&1 < /dev/null &!
