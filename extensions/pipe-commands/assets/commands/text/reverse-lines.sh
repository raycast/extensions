#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Reverse Lines
# @raycast.packageName Text Actions
# @raycast.mode pipe
# @raycast.argument1 {"type": "text", "placeholder": "Multiline text to reverse"}
# @raycast.icon 🔤

tail -r < /dev/stdin
