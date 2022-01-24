#!/bin/bash

# @raycast.title Copy File Content
# @raycast.mode silent
# @raycast.packageName File Actions
# @raycast.argument1 {"type": "file", "placeholder": "query", "percentEncoded": false}

pbcopy < "$1"
echo "Content of $(basename "$1") copied to clipboard!" >&2
