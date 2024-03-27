#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Copy Contents to Clipboard
# @raycast.packageName File Actions
# @raycast.mode silent
# @raycast.argument1 { "type": "file", "placeholder": "File or Directory" }

# check if extension is image
if [[ "$1" == *".png" ]] || [[ "$1" == *".jpg" ]] || [[ "$1" == *".jpeg" ]] || [[ "$1" == *".gif" ]] || [[ "$1" == *".bmp" ]] || [[ "$1" == *".tiff" ]]; then
  osascript -e "set the clipboard to (read (POSIX file \"$1\") as JPEG picture)"
else
  # copy file path to clipboard
  pbcopy < $1
fi