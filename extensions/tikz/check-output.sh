#!/bin/bash

# Check TikZ Tool Output
# Helps verify if the tool is generating PDFs correctly

echo "🔍 Checking TikZ Tool Output..."
echo ""

# Check AI tool output directory
AI_DIR="$HOME/Library/Application Support/com.raycast.macos/extensions/tikz/tikz-diagrams"
echo "📁 AI Tool Output Directory:"
echo "   $AI_DIR"
echo ""

if [ -d "$AI_DIR" ]; then
    echo "✅ Directory exists"

    # Count files
    TEX_COUNT=$(find "$AI_DIR" -name "*.tex" 2>/dev/null | wc -l | tr -d ' ')
    PDF_COUNT=$(find "$AI_DIR" -name "*.pdf" 2>/dev/null | wc -l | tr -d ' ')

    echo "   📄 .tex files: $TEX_COUNT"
    echo "   📑 .pdf files: $PDF_COUNT"
    echo ""

    if [ "$PDF_COUNT" -gt 0 ]; then
        echo "📊 Latest PDFs (most recent first):"
        ls -lhtr "$AI_DIR"/*.pdf 2>/dev/null | tail -5 | awk '{print "   " $9 " (" $5 ", " $6 " " $7 " " $8 ")"}'
        echo ""

        LATEST_PDF=$(ls -t "$AI_DIR"/*.pdf 2>/dev/null | head -1)
        echo "🎯 Most recent PDF:"
        echo "   $LATEST_PDF"
        echo ""
        echo "To open it:"
        echo "   open \"$LATEST_PDF\""
        echo ""
    else
        echo "⚠️  No PDFs found in AI tool directory"

        if [ "$TEX_COUNT" -gt 0 ]; then
            echo ""
            echo "❌ .tex files exist but no PDFs - compilation is failing!"
            echo ""
            echo "Latest .tex file:"
            LATEST_TEX=$(ls -t "$AI_DIR"/*.tex 2>/dev/null | head -1)
            echo "   $LATEST_TEX"
            echo ""
            echo "Try compiling manually:"
            echo "   cd \"$AI_DIR\""
            echo "   pdflatex -interaction=nonstopmode \"$(basename "$LATEST_TEX")\""
        fi
    fi
else
    echo "❌ Directory does not exist"
    echo "   The tool may not have been run yet"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check manual tool output directory
MANUAL_DIR="$HOME/Documents/TikZ-Diagrams"
echo "📁 Manual Command Output Directory:"
echo "   $MANUAL_DIR"
echo ""

if [ -d "$MANUAL_DIR" ]; then
    echo "✅ Directory exists"

    TEX_COUNT=$(find "$MANUAL_DIR" -name "*.tex" 2>/dev/null | wc -l | tr -d ' ')
    PDF_COUNT=$(find "$MANUAL_DIR" -name "*.pdf" 2>/dev/null | wc -l | tr -d ' ')

    echo "   📄 .tex files: $TEX_COUNT"
    echo "   📑 .pdf files: $PDF_COUNT"
    echo ""

    if [ "$PDF_COUNT" -gt 0 ]; then
        echo "📊 Latest PDFs:"
        ls -lhtr "$MANUAL_DIR"/*.pdf 2>/dev/null | tail -5 | awk '{print "   " $9 " (" $5 ")"}'
    else
        echo "⚠️  No PDFs found"
    fi
else
    echo "❌ Directory does not exist"
    echo "   The manual command may not have been used yet"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check LaTeX installation
echo "🔧 LaTeX Installation Check:"
echo ""

if command -v pdflatex &> /dev/null; then
    PDFLATEX_PATH=$(which pdflatex)
    echo "✅ pdflatex found:"
    echo "   $PDFLATEX_PATH"

    if command -v kpsewhich &> /dev/null; then
        STANDALONE=$(kpsewhich standalone.cls 2>/dev/null)
        if [ -n "$STANDALONE" ]; then
            echo "✅ standalone.cls found:"
            echo "   $STANDALONE"
        else
            echo "❌ standalone.cls NOT found"
            echo "   Install with: sudo tlmgr install standalone"
        fi
    fi
else
    echo "❌ pdflatex NOT found in PATH"
    echo "   Install BasicTeX: brew install --cask basictex"
    echo "   Or MacTeX: brew install --cask mactex"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "💡 Tips:"
echo ""
echo "1. If .tex files exist but no PDFs:"
echo "   → Compilation is failing (PATH or package issue)"
echo ""
echo "2. If no files at all:"
echo "   → Tool hasn't been called or confirmation was cancelled"
echo ""
echo "3. If PDFs exist but AI shows different diagram:"
echo "   → Tool is working! AI just chose to generate its own"
echo "   → Open the PDF to verify correctness"
echo ""
echo "4. To test manually:"
echo "   → Open Raycast → 'Create TikZ'"
echo "   → Enter: \\draw (0,0) circle (1cm);"
echo "   → Check if PDF is created"
echo ""
