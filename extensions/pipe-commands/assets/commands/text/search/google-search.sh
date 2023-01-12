#!/bin/bash

# @raycast.title Google Search
# @raycast.packageName Web Searches
# @raycast.icon Globe
# @raycast.mode silent
# @raycast.argument1 {"type": "text", "percentEncoded": true}

open "https://www.google.com/search?q=$1"
