#!/bin/bash

# @raycast.title Count Characters
# @raycast.mode silent
# @raycast.icon List
# @raycast.argument1 {"type": "text", "percentEncoded": false}

echo -n "${#1}"
