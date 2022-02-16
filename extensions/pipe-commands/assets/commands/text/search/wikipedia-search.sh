#!/bin/bash

# @raycast.title Wikipedia Search
# @raycast.packageName Web Searches
# @raycast.icon https://en.wikipedia.org/favicon.ico
# @raycast.input {"type": "text", "percentEncode": true}

read -r query
open "https://en.wikipedia.org/wiki/Special:Search/$query"
