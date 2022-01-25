#!/bin/bash

# @raycast.title Copy File Path to Clipboard
# @raycast.packageName File Actions
# @raycast.selection {"type": "file"}

pbcopy <<< "$1"
