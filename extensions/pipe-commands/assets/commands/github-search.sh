#!/bin/bash

# @raycast.title Github Search
# @raycast.input {"type": "text", "percentEncoded": true}

read -r query
open "https://github.com/search?q=$query"
