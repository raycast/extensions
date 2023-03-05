#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Prettify JSON
# @raycast.packageName Developer Utils
# @raycast.icon 🛠️
# @raycast.mode pipe
# @raycast.input { "type": "text" }

python3 -m json.tool --indent 2
