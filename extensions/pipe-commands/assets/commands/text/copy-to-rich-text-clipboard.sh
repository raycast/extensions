#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Copy to HTML Clipboard
# @raycast.packageName Text Actions
# @raycast.mode pipe
# @raycast.inputType text
# @raycast.icon 🔤

hexdump -ve '1/1 "%.2x"' | xargs printf 'set the clipboard to {«class HTML»:«data HTML%s»}' | osascript -
exit 1