#!/usr/bin/env bash

set -Eeuo pipefail

RAYCAST_EXTENSION_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
RAYCAST_ZPROFILE="${ZDOTDIR:-${HOME}}/.zprofile"

node_is_supported() {
  command -v node >/dev/null 2>&1 &&
    node -e 'const [major, minor, patch] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && (minor > 22 || (minor === 22 && patch >= 2))) ? 0 : 1)'
}

npm_is_supported() {
  command -v npm >/dev/null 2>&1 &&
    npm_version="$(npm --version)" node -e 'const [major] = process.env.npm_version.split(".").map(Number); process.exit(major >= 7 ? 0 : 1)'
}

add_profile_line() {
  local line="$1"
  touch "$RAYCAST_ZPROFILE"
  if ! grep -Fqx "$line" "$RAYCAST_ZPROFILE"; then
    printf '\n%s\n' "$line" >> "$RAYCAST_ZPROFILE"
  fi
}

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "Erro: este instalador foi preparado para macOS."
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "Erro: cURL não foi encontrado no macOS."
  exit 1
fi

RAYCAST_NEEDS_HOMEBREW=false
if ! open -Ra "Raycast" >/dev/null 2>&1 || ! node_is_supported || ! npm_is_supported; then
  RAYCAST_NEEDS_HOMEBREW=true
fi

if [[ "$RAYCAST_NEEDS_HOMEBREW" == true ]] && ! command -v brew >/dev/null 2>&1; then
  if ! xcode-select -p >/dev/null 2>&1; then
    echo "As Command Line Tools da Apple precisam ser instaladas primeiro."
    echo "Uma janela do macOS será aberta. Quando a instalação terminar, execute este script novamente."
    xcode-select --install
    exit 0
  fi

  echo "Instalando Homebrew pelo instalador oficial…"
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  if [[ -x /opt/homebrew/bin/brew ]]; then
    RAYCAST_BREW_BIN="/opt/homebrew/bin/brew"
    add_profile_line 'eval "$(/opt/homebrew/bin/brew shellenv)"'
  elif [[ -x /usr/local/bin/brew ]]; then
    RAYCAST_BREW_BIN="/usr/local/bin/brew"
    add_profile_line 'eval "$(/usr/local/bin/brew shellenv)"'
  else
    echo "Erro: o Homebrew terminou, mas o executável não foi encontrado."
    exit 1
  fi

  eval "$("$RAYCAST_BREW_BIN" shellenv)"
fi

if command -v brew >/dev/null 2>&1; then
  RAYCAST_BREW_BIN="$(command -v brew)"
elif [[ -x /opt/homebrew/bin/brew ]]; then
  RAYCAST_BREW_BIN="/opt/homebrew/bin/brew"
  eval "$("$RAYCAST_BREW_BIN" shellenv)"
elif [[ -x /usr/local/bin/brew ]]; then
  RAYCAST_BREW_BIN="/usr/local/bin/brew"
  eval "$("$RAYCAST_BREW_BIN" shellenv)"
else
  RAYCAST_BREW_BIN=""
fi

if ! open -Ra "Raycast" >/dev/null 2>&1; then
  echo "Instalando Raycast…"
  "$RAYCAST_BREW_BIN" install --cask raycast
fi

if ! node_is_supported || ! npm_is_supported; then
  echo "Instalando Node.js 22 LTS e npm…"
  if "$RAYCAST_BREW_BIN" list --versions node@22 >/dev/null 2>&1; then
    "$RAYCAST_BREW_BIN" upgrade node@22 || true
  else
    "$RAYCAST_BREW_BIN" install node@22
  fi

  RAYCAST_NODE_PREFIX="$("$RAYCAST_BREW_BIN" --prefix node@22)"
  export PATH="$RAYCAST_NODE_PREFIX/bin:$PATH"
  add_profile_line "export PATH=\"$RAYCAST_NODE_PREFIX/bin:\$PATH\""
fi

if ! node_is_supported; then
  echo "Erro: é necessário Node.js 22.22.2 ou superior. Versão encontrada: $(node --version 2>/dev/null || echo nenhuma)"
  exit 1
fi

if ! npm_is_supported; then
  echo "Erro: é necessário npm 7 ou superior. Versão encontrada: $(npm --version 2>/dev/null || echo nenhuma)"
  exit 1
fi

echo
echo "Pré-requisitos encontrados:"
echo "  Raycast: instalado"
echo "  Node.js: $(node --version)"
echo "  npm: $(npm --version)"
echo

cd "$RAYCAST_EXTENSION_DIR"

echo "Instalando dependências da extensão…"
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

echo "Validando a extensão…"
npm run build

echo
echo "Abrindo a extensão no Raycast…"
echo "Quando ela aparecer, você pode voltar a este terminal e pressionar Ctrl+C."
echo "A extensão continuará instalada localmente."
echo

exec npm run dev
