#!/bin/bash

# @raycast.title Github Search
# @raycast.packageName Web Searches
# @raycast.icon Globe
# @raycast.mode silent
# @raycast.argument1 {"type": "text", "percentEncoded": true}

open "https://github.com/search?q=$1"
