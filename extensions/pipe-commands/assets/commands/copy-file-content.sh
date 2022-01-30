#!/bin/bash

# @raycast.title Extract File Content
# @raycast.input {"type": "file"}

read -r input_file_path
cat "$input_file_path"
