#!/usr/bin/env bash
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh"
else
  curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash
  . "$NVM_DIR/nvm.sh"
fi

nvm install
nvm alias default "$(tr -d '[:space:]' < .nvmrc)"
export PATH="$(dirname "$(nvm which default)"):$HOME/.nub/bin:$PATH"
hash -r

if ! command -v nub >/dev/null 2>&1 || [ "$(nub --version | awk 'NR==1{print $1}' | tr -d 'v')" != "0.9.6" ]; then
  curl -fsSL https://nubjs.com/install.sh | bash -s 0.9.6
  export PATH="$HOME/.nub/bin:$PATH"
fi

nub install --frozen-lockfile
