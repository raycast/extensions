#!/bin/bash

# @raycast.title Prettify JSON
# @raycast.packageName Developer Utils
# @raycast.icon 🛠️
# @raycast.mode fullOutput
# @raycast.argument1 {"type": "text"}

python3 -m json.tool --indent 2 <<< "$1"
