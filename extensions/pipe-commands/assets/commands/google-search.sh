#!/bin/bash

# @raycast.title Google Search
# @raycast.input {"type": "text", "percentEncoded": true}

read -r query
open "https://www.google.com/search?q=$query"
