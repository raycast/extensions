#!/bin/bash
# Script to resolve merge conflicts in raycast-extensions repository
# Run this from the root of the raycast-extensions repository

echo "Resolving merge conflicts in extensions/wubi/..."

# Navigate to the extensions/wubi directory (adjust path as needed)
cd extensions/wubi 2>/dev/null || {
    echo "Error: Could not find extensions/wubi directory"
    echo "Please run this script from the root of your raycast-extensions repository"
    exit 1
}

# For text files, accept the current version (ours) which should have the fixes
echo "Resolving package.json..."
git checkout --ours package.json 2>/dev/null || git checkout --theirs package.json

echo "Resolving package-lock.json..."
git checkout --ours package-lock.json 2>/dev/null || git checkout --theirs package-lock.json

echo "Resolving CHANGELOG.md..."
git checkout --ours CHANGELOG.md 2>/dev/null || git checkout --theirs CHANGELOG.md

# For binary files (screenshots), accept ours (you can change to --theirs if needed)
echo "Resolving screenshot images..."
git checkout --ours assets/screenshot-1.png 2>/dev/null
git checkout --ours assets/screenshot-2.png 2>/dev/null
git checkout --ours assets/screenshot-3.png 2>/dev/null

# Add the resolved files
git add package.json package-lock.json CHANGELOG.md
git add assets/screenshot-*.png

echo "Conflicts resolved. Files staged for commit."
echo "Run 'git commit' to complete the merge."

