#!/bin/bash

# ComfyUI Image Processor - Instalační script
# Tento script nastaví všechno potřebné pro Raycast extension

set -e  # Ukončit při chybě

echo "🚀 ComfyUI Image Processor - Instalace"
echo "========================================"
echo ""

# Barvy pro výstup
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funkce pro barevný výstup
print_success() { echo -e "${GREEN}✓${NC} $1"; }
print_error() { echo -e "${RED}✗${NC} $1"; }
print_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
print_info() { echo -e "${BLUE}ℹ${NC} $1"; }

# 1. Kontrola Node.js
echo "1️⃣  Kontrola Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js nainstalován: $NODE_VERSION"
else
    print_error "Node.js není nainstalován!"
    echo "   Stáhněte z: https://nodejs.org/"
    exit 1
fi

# 2. Kontrola npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    print_success "npm nainstalován: v$NPM_VERSION"
else
    print_error "npm není nainstalován!"
    exit 1
fi

# 3. Vyčištění node_modules (důležité pro fix React typů!)
echo ""
echo "2️⃣  Vyčištění předchozí instalace..."
if [ -d "node_modules" ]; then
    print_warning "Mažu node_modules pro čistou instalaci..."
    rm -rf node_modules
    print_success "node_modules smazány"
fi
if [ -f "package-lock.json" ]; then
    rm -f package-lock.json
    print_success "package-lock.json smazán"
fi

# 4. Instalace závislostí
echo ""
echo "3️⃣  Instalace závislostí..."
npm install
print_success "Závislosti nainstalovány"

# 5. Vytvoření workflows složky
echo ""
echo "4️⃣  Nastavení workflows složky..."
WORKFLOWS_DIR="$HOME/Documents/ComfyUI/workflows"
if [ ! -d "$WORKFLOWS_DIR" ]; then
    mkdir -p "$WORKFLOWS_DIR"
    print_success "Vytvořena složka: $WORKFLOWS_DIR"
else
    print_info "Složka již existuje: $WORKFLOWS_DIR"
fi

# 6. Kontrola/vytvoření ikonky
echo ""
echo "5️⃣  Kontrola ikonky..."
if [ -f "command-icon.png" ]; then
    print_success "Ikonka již existuje"
else
    print_warning "Ikonka neexistuje!"
    echo "   Vytvářím ikonku..."
    
    if [ -f "generate-icon.sh" ]; then
        chmod +x generate-icon.sh
        if ./generate-icon.sh; then
            print_success "Ikonka vytvořena!"
        else
            print_warning "Automatické vytvoření selhalo"
            echo "   Zkuste manuálně:"
            echo "   • brew install imagemagick"
            echo "   • ./generate-icon.sh"
            echo "   Nebo vytvořte command-icon.png ručně (512x512 px)"
        fi
    else
        print_warning "generate-icon.sh nenalezen"
        echo "   Prosím vytvořte 'command-icon.png' manuálně (512x512 px)"
    fi
fi

# 7. Build extension
echo ""
echo "6️⃣  Build extension..."
npm run build
print_success "Extension zbuildována"

# 8. Instrukce
echo ""
echo "======================================"
print_success "Instalace dokončena!"
echo "======================================"
echo ""
echo "📋 Další kroky:"
echo ""
echo "1. Import do Raycastu:"
echo "   - Otevřete Raycast (Cmd+Space)"
echo "   - Napište 'Import Extension'"
echo "   - Vyberte tuto složku: $(pwd)"
echo ""
echo "2. Nastavte preferences v Raycastu:"
echo "   - Server URL: http://192.168.3.88:5000"
echo "   - Workflows Path: $WORKFLOWS_DIR"
echo "   - Output Suffix: _edited"
echo ""
echo "3. Přidejte workflow soubory:"
echo "   - Exportujte z ComfyUI (Save as API Format)"
echo "   - Zkopírujte do: $WORKFLOWS_DIR"
echo ""
echo "4. Spusťte extension:"
echo "   - Raycast → 'Process Images'"
echo ""
print_info "Pro detaily viz README.md nebo QUICKSTART.md"
echo ""
print_warning "DŮLEŽITÉ: Pokud máte stále TypeScript chyby, smažte node_modules a spusťte:"
echo "   rm -rf node_modules package-lock.json && npm install"
echo ""
