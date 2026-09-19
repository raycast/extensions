#!/usr/bin/env bash

set -u

RAYCAST_MISSING=0

report_command() {
  local label="$1"
  local command_name="$2"
  shift 2

  if command -v "$command_name" >/dev/null 2>&1; then
    printf '✓ %-22s %s\n' "$label" "$("$@" 2>/dev/null | head -1)"
  else
    printf '✗ %-22s não instalado\n' "$label"
    RAYCAST_MISSING=1
  fi
}

echo "Diagnóstico para Academic"
echo

printf '✓ %-22s %s %s\n' "macOS" "$(sw_vers -productVersion)" "($(uname -m))"

if open -Ra "Raycast" >/dev/null 2>&1; then
  RAYCAST_VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' /Applications/Raycast.app/Contents/Info.plist 2>/dev/null || echo instalado)"
  printf '✓ %-22s %s\n' "Raycast" "$RAYCAST_VERSION"
else
  printf '✗ %-22s não instalado\n' "Raycast"
  RAYCAST_MISSING=1
fi

if xcode-select -p >/dev/null 2>&1; then
  printf '✓ %-22s %s\n' "Command Line Tools" "$(xcode-select -p)"
else
  printf '✗ %-22s não instaladas\n' "Command Line Tools"
  RAYCAST_MISSING=1
fi

if command -v brew >/dev/null 2>&1; then
  printf '✓ %-22s %s\n' "Homebrew" "$(brew --version | head -1)"
else
  printf '• %-22s não instalado (opcional)\n' "Homebrew"
fi

report_command "Node.js 22.22.2+" "node" node --version
report_command "npm 7+" "npm" npm --version
report_command "Git" "git" git --version
report_command "cURL" "curl" curl --version

if command -v node >/dev/null 2>&1 && ! node -e 'const [major, minor, patch] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && (minor > 22 || (minor === 22 && patch >= 2))) ? 0 : 1)'; then
  echo "✗ A versão do Node.js é antiga; é necessário 22.22.2 ou superior."
  RAYCAST_MISSING=1
fi

if command -v npm >/dev/null 2>&1 && ! npm_version="$(npm --version)" node -e 'const [major] = process.env.npm_version.split(".").map(Number); process.exit(major >= 7 ? 0 : 1)'; then
  echo "✗ A versão do npm é antiga; é necessário npm 7 ou superior."
  RAYCAST_MISSING=1
fi

echo
if [[ "$RAYCAST_MISSING" -eq 0 ]]; then
  echo "Todos os pré-requisitos estão instalados."
else
  echo "Há componentes ausentes. Execute: ./install-local.sh"
fi

exit "$RAYCAST_MISSING"
