#!/bin/bash

# @raycast.title Google Search
# @raycast.icon https://www.google.com/favicon.ico
# @raycast.packageName Web Searches
# @raycast.input {"type": "text", "percentEncoded": true}

read -r query
open "https://www.google.com/search?q=$query"
