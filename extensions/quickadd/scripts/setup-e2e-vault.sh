#!/usr/bin/env bash
set -euo pipefail
plugin_src="${QUICKADD_DIR:-$HOME/Developer/quickadd}"
dest="$(cd "$(dirname "$0")/.." && pwd)/e2e-vault/.obsidian/plugins/quickadd"
for file in main.js manifest.json styles.css; do
  cp "$plugin_src/$file" "$dest/$file"
done
echo "Copied QuickAdd $(node -p "require('$dest/manifest.json').version") into $dest"
