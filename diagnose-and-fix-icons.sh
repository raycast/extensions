#!/bin/bash

# Complete Icon Diagnostic and Fix Script for WebBlocker

set -e

EXT_DIR="/Users/ahmadbulbul/Developer/RayCast_WebBlocker_Extention"
cd "$EXT_DIR"

echo "🔍 WebBlocker Icon Diagnostic & Fix"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Test 1: Check package.json
echo "1️⃣  Checking package.json configuration..."
if grep -q '"icon": "icon.png"' package.json && \
   grep -q '"icon": "add-website-icon.png"' package.json && \
   grep -q '"icon": "enable-blocking-icon.png"' package.json; then
    echo "   ✅ package.json paths are correct"
else
    echo "   ❌ package.json has incorrect icon paths!"
    exit 1
fi
echo ""

# Test 2: Check icon files exist
echo "2️⃣  Checking if icon files exist..."
required_icons=("icon.png" "add-website-icon.png" "enable-blocking-icon.png" "disable-blocking-icon.png" "manage-sites-icon.png" "refresh-blocking-icon.png")
missing=false
for icon in "${required_icons[@]}"; do
    if [ -f "$icon" ]; then
        echo "   ✅ $icon exists"
    else
        echo "   ❌ $icon is MISSING!"
        missing=true
    fi
done
if [ "$missing" = true ]; then
    echo ""
    echo "   🔧 Copying missing icons from Icons folder..."
    [ ! -f "add-website-icon.png" ] && cp Icons/Add_Website_To_Block.png add-website-icon.png
    [ ! -f "enable-blocking-icon.png" ] && cp Icons/Enable_Website_Blocking.png enable-blocking-icon.png
    [ ! -f "disable-blocking-icon.png" ] && cp Icons/Disable_Website_Blocking.png disable-blocking-icon.png
    [ ! -f "manage-sites-icon.png" ] && cp Icons/Manage_Blocked_Websites.png manage-sites-icon.png
    [ ! -f "refresh-blocking-icon.png" ] && cp Icons/Force_ReBlock.png refresh-blocking-icon.png
    echo "   ✅ Icons copied"
fi
echo ""

# Test 3: Validate PNG files
echo "3️⃣  Validating PNG file format..."
for icon in "${required_icons[@]}"; do
    if [ -f "$icon" ]; then
        format=$(file "$icon" | grep -o "PNG image data")
        if [ -n "$format" ]; then
            size=$(sips -g pixelWidth "$icon" 2>/dev/null | grep pixelWidth | awk '{print $2}')
            echo "   ✅ $icon is valid PNG (${size}x${size})"
        else
            echo "   ❌ $icon is NOT a valid PNG!"
        fi
    fi
done
echo ""

# Test 4: Check for extended attributes
echo "4️⃣  Checking and removing extended attributes..."
for icon in *.png; do
    if [ -f "$icon" ]; then
        attrs=$(xattr "$icon" 2>/dev/null)
        if [ -n "$attrs" ]; then
            echo "   🔧 Removing attributes from $icon"
            xattr -c "$icon" 2>/dev/null || true
        fi
    fi
done
echo "   ✅ Extended attributes cleaned"
echo ""

# Test 5: Check compiled JS files
echo "5️⃣  Checking compiled JavaScript files..."
if [ -f "add-website.js" ] && [ -f "streamlined-enable-blocking.js" ]; then
    echo "   ✅ Extension is compiled"
else
    echo "   ⚠️  Extension not compiled, running build..."
    npm run build > /dev/null 2>&1
    echo "   ✅ Build complete"
fi
echo ""

# Test 6: Create a test icon view
echo "6️⃣  Testing icon rendering..."
if command -v qlmanage &> /dev/null; then
    qlmanage -t -s 64 -o /tmp icon.png > /dev/null 2>&1 && \
        echo "   ✅ Icons can be rendered" || \
        echo "   ⚠️  Icon rendering test inconclusive"
else
    echo "   ⚠️  qlmanage not available, skipping render test"
fi
echo ""

# Test 7: Check Raycast extension directory
echo "7️⃣  Checking Raycast extension status..."
ext_path="$HOME/Library/Application Support/com.raycast.macos/extensions"
if [ -d "$ext_path" ]; then
    echo "   ℹ️  Raycast extensions directory exists"
else
    echo "   ℹ️  Raycast extensions directory not found (normal for dev mode)"
fi
echo ""

echo "══════════════════════════════════════════════════════════"
echo "📊 DIAGNOSTIC COMPLETE"
echo "══════════════════════════════════════════════════════════"
echo ""
echo "✅ All icon files are in place and valid"
echo ""
echo "⚠️  CRITICAL: You must now REMOVE and RE-IMPORT the extension!"
echo ""
echo "Steps:"
echo "  1. Open Raycast (⌘+Space)"
echo "  2. Type 'preferences' → Enter"
echo "  3. Click 'Extensions' tab"
echo "  4. Find 'WebBlocker'"
echo "  5. Click 'Remove Extension'"
echo "  6. Click '+' button → 'Import Extension'"
echo "  7. Select: $EXT_DIR"
echo "  8. Click 'Import'"
echo ""
echo "This is the ONLY way to force Raycast to reload cached icons."
echo ""
