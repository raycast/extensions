#!/usr/bin/env bash
set -euo pipefail
dest="$(cd "$(dirname "$0")/.." && pwd)/demo-vault/.obsidian/plugins/quickadd"
version="$(node -p "require('$dest/manifest.json').version")"
gh release download "$version" -R chhoumann/quickadd -p main.js -p styles.css --clobber -D "$dest"
echo "Installed QuickAdd $version into $dest"
