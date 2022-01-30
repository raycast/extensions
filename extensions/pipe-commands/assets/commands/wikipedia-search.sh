#!/bin/bash

# @raycast.title Wikipedia Search
# @raycast.input {"type": "text", "percentEncode": true}

read -r query
open "https://en.wikipedia.org/wiki/Special:Search/$query"
