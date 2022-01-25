#!/bin/bash

# @raycast.title Copy File Path to Clipboard
# @raycast.selection {"type": "file"}

pbcopy <<< "$1"
