#!/bin/bash

# @raycast.title Move to Trash
# @raycast.icon Trash
# @raycast.packageName File Actions
# @raycast.argument1 {"type": "file"}

mv "$1" "$HOME/.Trash"
