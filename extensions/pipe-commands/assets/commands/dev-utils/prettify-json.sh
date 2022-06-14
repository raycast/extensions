#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Prettify JSON
# @raycast.packageName Developer Utils
# @raycast.icon 🛠️
# @raycast.mode pipe
# @raycast.argument1 {"type": "text", "placeholder": "JSON to prettify"}

python3 -m json.tool --indent 2 <<< "$1"
