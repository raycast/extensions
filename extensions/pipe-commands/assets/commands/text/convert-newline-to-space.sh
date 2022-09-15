#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Convert Newline to Spaces
# @raycast.packageName Text Actions
# @raycast.mode pipe
# @raycast.argument1 {"type": "text", "placeholder": "Multiline text to reverse"}
# @raycast.icon 🔤

echo "$1" | tr '\n' ' '
