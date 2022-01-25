#!/bin/bash

# @raycast.title Copy File Path
# @raycast.packageName File Actions
# @raycast.selection {"type": "file"}

pbcopy <<< "$1"
