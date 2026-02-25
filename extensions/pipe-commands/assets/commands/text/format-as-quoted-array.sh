#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Format as Quoted Array
# @raycast.packageName Text Actions
# @raycast.mode pipe
# @raycast.inputType text
# @raycast.icon 🔤

while IFS= read -r line || [ -n "$line" ]; do
    printf '"%s",
' "$line"
done
