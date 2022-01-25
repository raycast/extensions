#!/bin/bash

# @raycast.title Copy File Content to Clipboard
# @raycast.selection {"type": "file"}

pbcopy < "$1"
