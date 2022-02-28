#!/bin/bash

# @raycast.title Wikipedia Search
# @raycast.packageName Web Searches
# @raycast.icon Globe
# @raycast.argument1 {"type": "text", "percentEncoded": true}

open "https://en.wikipedia.org/wiki/Special:Search/$1"
