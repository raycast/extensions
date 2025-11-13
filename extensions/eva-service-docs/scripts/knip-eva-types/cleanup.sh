#!/bin/bash

# Script to cleanup unused files in eva-types directory using knip

set -e  # Exit on error

# Get the script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/knip.json"

echo "Checking for unused files in ./eva-types..."
echo ""

# First, show what files would be removed
echo "Running knip to find unused files in eva-types..."
npx knip --config "$CONFIG_FILE" --include files --files 2>/dev/null || echo "No unused files found in eva-types"

echo ""
read -p "Do you want to remove unused files in eva-types? (y/N): " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo "Running knip to remove unused files in eva-types only (dependencies will NOT be touched)..."
echo ""

# Run knip with fix and allow-remove-files flags using the eva-types config
# Note: Using --fix-type files ensures we ONLY remove files, not dependencies from package.json
npx knip --config "$CONFIG_FILE" --fix --fix-type files --allow-remove-files

echo ""
echo "✓ Cleanup complete!"
