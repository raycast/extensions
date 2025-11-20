#!/bin/bash

# HyperDash Build Script for Raycast Extensions
# Uses Raycast's official 'ray build' command for proper extension compilation
#
# Usage:
#   ./build.sh        - Production build with version increment (uses ray build -e dist)
#   ./build.sh dev    - Development build (uses ray build -e dev)
#   npm run build     - Build without version increment

set -e  # Exit on error

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

MODE=${1:-build}

if [ "$MODE" = "dev" ]; then
    echo "🚀 Building extension in development mode..."
    echo "📝 After importing to Raycast, changes require rebuild"
    echo ""
    npm run dev
    echo ""
    echo "✅ Development build complete!"
    echo "💡 Tip: Reimport extension in Raycast to see changes"
else
    echo "🔨 Building HyperDASH Raycast Extension (Production)..."
    
    # Auto-increment version (patch version)
    echo "📝 Incrementing version..."
    CURRENT_VERSION=$(node -p "require('./package.json').version")
    echo "Current version: $CURRENT_VERSION"
    
    # Split version into parts (e.g., "0.3.0" -> 0, 3, 0)
    IFS='.' read -ra VERSION_PARTS <<< "$CURRENT_VERSION"
    MAJOR="${VERSION_PARTS[0]}"
    MINOR="${VERSION_PARTS[1]}"
    PATCH="${VERSION_PARTS[2]}"
    
    # Increment patch version
    NEW_PATCH=$((PATCH + 1))
    NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"
    
    # Update package.json with new version
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        sed -i '' "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
        sed -i '' "s/v$CURRENT_VERSION -/v$NEW_VERSION -/" package.json
    else
        # Linux
        sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
        sed -i "s/v$CURRENT_VERSION -/v$NEW_VERSION -/" package.json
    fi
    
    echo "New version: $NEW_VERSION"
    
    # Clean previous build
    echo "🧹 Cleaning previous build..."
    rm -rf dist
    
    # Build the extension
    echo "📦 Building extension..."
    npm run build
    
    # Verify build output
    if [ -f "dist/browse.js" ] && [ -f "dist/projects.js" ]; then
        echo "✅ Build successful!"
        echo ""
        echo "📦 Version: $NEW_VERSION"
        echo ""
        echo "Output files:"
        ls -lh dist/*.js
        echo ""
        echo "📍 Build location: $SCRIPT_DIR/dist"
    else
        echo "❌ Build failed - output files not found"
        exit 1
    fi
fi
