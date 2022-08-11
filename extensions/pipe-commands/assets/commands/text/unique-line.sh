#!/bin/bash

# @raycast.title Unique Lines
# @raycast.mode replace
# @raycast.icon Text
# @raycast.argument1 {"type": "text", "percentEncoded": false}

uniq <<< "$1"