#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Google Search
# @raycast.packageName Web Searches
# @raycast.icon https://upload.wikimedia.org/wikipedia/commons/5/53/Google_%22G%22_Logo.svg
# @raycast.mode silent
# @raycast.argument1 {"type": "text", "percentEncoded": true}

open "https://www.google.com/search?q=$1"
