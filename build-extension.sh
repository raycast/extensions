#!/bin/bash

echo "🔨 Building WebBlocker Extension for Raycast"
echo "=============================================="
echo ""

# Clean previous build
echo "1. Cleaning previous build..."
rm -f *.js *.js.map *.d.ts *.d.ts.map
rm -rf lib/ dist/
echo "   ✅ Cleaned build artifacts"
echo ""

# Install dependencies
echo "2. Installing dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "   ❌ Failed to install dependencies"
    exit 1
fi
echo "   ✅ Dependencies installed"
echo ""

# Build TypeScript
echo "3. Compiling TypeScript..."
npm run build
if [ $? -ne 0 ]; then
    echo "   ❌ TypeScript compilation failed"
    exit 1
fi
echo "   ✅ TypeScript compiled successfully"
echo ""

# Verify build
echo "4. Verifying build output..."
REQUIRED_FILES=("add-website.js" "enable-blocking.js" "disable-blocking.js" "view-blocked-sites.js")
MISSING_FILES=()

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        MISSING_FILES+=("$file")
    fi
done

if [ ${#MISSING_FILES[@]} -ne 0 ]; then
    echo "   ❌ Missing files: ${MISSING_FILES[*]}"
    exit 1
fi

echo "   ✅ All required files present:"
for file in "${REQUIRED_FILES[@]}"; do
    echo "      • $file"
done
echo ""

# Run tests
echo "5. Running tests..."
npm test
if [ $? -ne 0 ]; then
    echo "   ⚠️  Tests failed, but build is complete"
else
    echo "   ✅ All tests passed"
fi
echo ""

echo "🎉 WebBlocker Extension Build Complete!"
echo "========================================"
echo ""
echo "📁 Extension ready at: $(pwd)"
echo ""
echo "📋 Next steps:"
echo "   1. Open Raycast preferences (⌘+,)"
echo "   2. Go to Extensions → Add Extension"
echo "   3. Import from this directory"
echo "   4. Test the commands!"
echo ""
echo "🧪 Available commands:"
echo "   • Add Website to Block"
echo "   • Enable Site Blocking"
echo "   • Disable Site Blocking"  
echo "   • View Blocked Sites"