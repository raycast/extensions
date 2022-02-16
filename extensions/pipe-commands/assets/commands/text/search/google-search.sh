#!/bin/bash

# @raycast.title Google Search
# @raycast.packageName Web Searches
# @raycast.icon Globe
# @raycast.input {"type": "text", "percentEncoded": true}

read -r query
open "https://www.google.com/search?q=$query"
