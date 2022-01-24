#!/bin/bash

# @raycast.title Google Search
# @raycast.mode silent
# @raycast.packageName Web Searches
# @raycast.argument1 {"type": "text", "placeholder": "query", "percentEncoded": true}

open "https://www.google.com/search?q=$1"
