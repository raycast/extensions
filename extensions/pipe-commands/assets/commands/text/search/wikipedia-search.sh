#!/bin/bash

# @raycast.title Wikipedia Search
# @raycast.packageName Web Searches
# @raycast.icon Globe
# @raycast.input {"type": "text", "percentEncode": true}

read -r query
open "https://en.wikipedia.org/wiki/Special:Search/$query"
