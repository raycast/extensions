#!/bin/bash

# @raycast.title Move to Trash
# @raycast.icon Trash
# @raycast.packageName File Actions
# @raycast.input {"type": "file"}

read -r input_file_path
mv "$input_file_path" "$HOME/.Trash"
