#!/usr/bin/osascript

# @raycast.title Copy File to Clipboard
# @raycast.selection {"type": "file"}

on run args
  set the clipboard to POSIX file (first item of args)
end
