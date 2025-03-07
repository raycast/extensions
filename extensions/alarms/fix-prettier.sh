#!/bin/bash

# Fix only Prettier issues without running other lint checks

echo "Fixing Prettier formatting issues..."

# Find all TypeScript/React files
TS_FILES=$(find src -type f -name "*.ts" -o -name "*.tsx")

# Run Prettier directly on the files
npx prettier --write $TS_FILES

echo "✅ Prettier formatting completed!" 