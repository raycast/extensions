#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Format as Quoted Array
# @raycast.packageName Text Actions
# @raycast.mode pipe
# @raycast.inputType text
# @raycast.icon 🔤

first=true
while IFS= read -r line || [ -n "$line" ]; do
    if [ "$first" = false ]; then
        echo ","
    fi
    printf '"%s"' "$line"
    first=false
done
[ "$first" = false ] && echo
