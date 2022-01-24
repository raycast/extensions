#!/bin/bash

# @raycast.title Copy to tmp
# @raycast.mode silent
# @raycast.packageName File Actions
# @raycast.argument1 {"type": "file", "placeholder": "query", "percentEncoded": false}

cp "$1" /tmp/
echo "Copied $1 to /tmp/" >&2
