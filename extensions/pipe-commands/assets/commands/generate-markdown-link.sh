#!/bin/bash

# @raycast.title Generate Markdown Link
# @raycast.input {"type": "text"}

read -r selection
echo "[$selection]($(pbpaste))"
