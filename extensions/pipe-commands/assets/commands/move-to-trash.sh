#!/bin/bash

# @raycast.title Move to Trash
# @raycast.input {"type": "file"}

read -r input_file_path
mv "$input_file_path" "$HOME/.Trash"
