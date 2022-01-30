#!/bin/bash

# @raycast.title Generate Markdown Link
# @raycast.packageName Markdown
# @raycast.input {"type": "text"}

read -r selection
echo "[$selection]($(pbpaste))"
