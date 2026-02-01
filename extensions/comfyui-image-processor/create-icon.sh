#!/bin/bash

# Script pro vytvoření command-icon.png z SVG

echo "🎨 Vytváření ikonky pro Raycast extension..."

# Kontrola zda existuje SVG
if [ ! -f "icon-template.svg" ]; then
    echo "❌ Soubor icon-template.svg nenalezen!"
    exit 1
fi

# Pokus o konverzi pomocí různých nástrojů

# 1. Zkusit ImageMagick (convert)
if command -v convert &> /dev/null; then
    echo "✓ Používám ImageMagick..."
    convert -background none -resize 512x512 icon-template.svg command-icon.png
    echo "✅ Ikonka vytvořena pomocí ImageMagick!"
    exit 0
fi

# 2. Zkusit rsvg-convert (librsvg)
if command -v rsvg-convert &> /dev/null; then
    echo "✓ Používám rsvg-convert..."
    rsvg-convert -w 512 -h 512 icon-template.svg -o command-icon.png
    echo "✅ Ikonka vytvořena pomocí rsvg-convert!"
    exit 0
fi

# 3. Zkusit Inkscape
if command -v inkscape &> /dev/null; then
    echo "✓ Používám Inkscape..."
    inkscape icon-template.svg --export-type=png --export-filename=command-icon.png -w 512 -h 512
    echo "✅ Ikonka vytvořena pomocí Inkscape!"
    exit 0
fi

# 4. Zkusit cairosvg (Python)
if command -v cairosvg &> /dev/null; then
    echo "✓ Používám cairosvg..."
    cairosvg icon-template.svg -o command-icon.png -W 512 -H 512
    echo "✅ Ikonka vytvořena pomocí cairosvg!"
    exit 0
fi

# Žádný nástroj nenalezen
echo "❌ Nebyl nalezen žádný nástroj pro konverzi SVG → PNG"
echo ""
echo "Nainstalujte jeden z následujících nástrojů:"
echo ""
echo "  macOS:"
echo "    brew install imagemagick"
echo "    brew install librsvg"
echo "    brew install inkscape"
echo ""
echo "  nebo použijte online konvertor:"
echo "    https://cloudconvert.com/svg-to-png"
echo ""
echo "Pak přejmenujte výstupní soubor na 'command-icon.png'"
exit 1
