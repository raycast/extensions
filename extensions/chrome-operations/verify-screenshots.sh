#!/bin/bash

echo "=================================="
echo "Screenshot Verification"
echo "=================================="
echo ""

# Check if sips is available
if ! command -v sips &> /dev/null; then
    echo "ERROR: sips command not found"
    exit 1
fi

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCREENSHOT_DIR="metadata"
REQUIRED_WIDTH=2000
REQUIRED_HEIGHT=1250

echo "Checking screenshots in $SCREENSHOT_DIR..."
echo ""

SCREENSHOTS=$(find "$SCREENSHOT_DIR" -name "*.png" -not -name "SCREENSHOTS.md" | wc -l | tr -d ' ')

if [ "$SCREENSHOTS" -lt 3 ]; then
    echo -e "${RED}[FAIL]${NC} Found $SCREENSHOTS screenshots (minimum 3 required)"
    exit 1
fi

echo -e "${GREEN}[PASS]${NC} Found $SCREENSHOTS screenshots"
echo ""

ALL_VALID=true

for screenshot in "$SCREENSHOT_DIR"/*.png; do
    filename=$(basename "$screenshot")
    if [ "$filename" = "SCREENSHOTS.md" ]; then
        continue
    fi
    
    echo "Checking: $filename"
    
    # Get dimensions
    dimensions=$(sips -g pixelWidth -g pixelHeight "$screenshot" 2>/dev/null)
    if [ $? -ne 0 ]; then
        echo -e "  ${RED}[FAIL]${NC} Could not read screenshot"
        ALL_VALID=false
        continue
    fi
    
    width=$(echo "$dimensions" | grep pixelWidth | awk '{print $2}')
    height=$(echo "$dimensions" | grep pixelHeight | awk '{print $2}')
    
    if [ "$width" = "$REQUIRED_WIDTH" ] && [ "$height" = "$REQUIRED_HEIGHT" ]; then
        echo -e "  ${GREEN}[PASS]${NC} ${width}x${height} (correct)"
    else
        echo -e "  ${RED}[FAIL]${NC} ${width}x${height} (expected ${REQUIRED_WIDTH}x${REQUIRED_HEIGHT})"
        ALL_VALID=false
    fi
done

echo ""
echo "=================================="

if [ "$ALL_VALID" = true ]; then
    echo -e "${GREEN}All screenshots verified!${NC}"
    echo "Resolution: ${REQUIRED_WIDTH}x${REQUIRED_HEIGHT}"
    echo "Count: $SCREENSHOTS"
    exit 0
else
    echo -e "${RED}Some screenshots failed verification${NC}"
    exit 1
fi
