#!/bin/bash
# Reset Better Contacts extension data for testing fresh install flow
# This removes all cached data and downloaded binary so you can test the first-run experience

set -e

echo "🧹 Resetting Better Contacts extension data..."

# Remove SQLite cache and downloaded binary
CACHE_DIR="$HOME/Library/Application Support/better-contacts"
if [ -d "$CACHE_DIR" ]; then
    rm -rf "$CACHE_DIR"
    echo "✓ Removed cache directory: $CACHE_DIR"
    echo "  (includes SQLite database and downloaded binary)"
else
    echo "- Cache directory not found (already clean)"
fi

# Remove old cache directory if it exists (from before rename)
OLD_CACHE_DIR="$HOME/Library/Application Support/contacts-helper"
if [ -d "$OLD_CACHE_DIR" ]; then
    rm -rf "$OLD_CACHE_DIR"
    echo "✓ Removed old cache directory: $OLD_CACHE_DIR"
fi

echo ""
echo "✅ Reset complete!"
echo ""
echo "Next steps to test fresh install:"
echo "1. Open Raycast"
echo "2. Run 'Search Contacts' command"
echo "3. Binary will be downloaded automatically"
echo "4. Grant Contacts permission if prompted"
echo "5. Verify contacts load correctly"
