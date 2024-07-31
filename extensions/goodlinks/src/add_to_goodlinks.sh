#!/bin/bash

set -e

if [ -z "$1" ]; then
    echo "Error: No URL provided"
    exit 1
fi

url=$(echo "$1" | sed 's/"/\\"/g')
osascript <<EOF
tell application "GoodLinks"
    add "$url"
end tell
EOF