#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Github Search
# @raycast.packageName Web Searches
# @raycast.icon ./icons/github.png
# @raycast.iconDark ./icons/github-dark.png
# @raycast.mode silent
# @raycast.argument1 {"type": "text", "percentEncoded": true}

open "https://github.com/search?q=$1"
