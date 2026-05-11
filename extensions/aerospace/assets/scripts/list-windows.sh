#!/usr/bin/env bash

# References:
# - https://nikitabobko.github.io/AeroSpace/commands#list-windows
# - https://www.alfredapp.com/help/workflows/inputs/script-filter/json/

result=$(aerospace list-windows --json --workspace focused --format "%{app-name} %{window-title} %{window-id} %{app-pid} %{workspace} %{app-bundle-id}")
echo "$result"


if [ -n "$DEBUG" ]; then
  echo "" 
  echo "--- END: $(date) ---"
  echo ""
fi
