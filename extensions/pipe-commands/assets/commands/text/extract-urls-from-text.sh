#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Extract URLs from Text
# @raycast.packageName Text Actions
# @raycast.icon 🔤
# @raycast.mode pipe
# @raycast.inputType text

grep -oE 'https?://[^[:space:]\)]+|((^|~/|./|/)[a-zA-Z0-9_./@-]+){2,}'