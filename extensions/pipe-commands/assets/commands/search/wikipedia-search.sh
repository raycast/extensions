#!/bin/bash

# @raycast.schemaVersion 1
# @raycast.title Wikipedia Search
# @raycast.packageName Web Searches
# @raycast.icon https://upload.wikimedia.org/wikipedia/commons/8/80/Wikipedia-logo-v2.svg
# @raycast.mode silent
# @raycast.argument1 {"type": "text", "percentEncoded": true}

open "https://en.wikipedia.org/wiki/Special:Search/$1"
