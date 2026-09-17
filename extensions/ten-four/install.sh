#!/usr/bin/env bash
# Install the `tenfour` CLI by symlinking it into a directory on your PATH.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SRC="$SCRIPT_DIR/assets/tenfour"

for DIR in /opt/homebrew/bin /usr/local/bin "$HOME/.local/bin"; do
  if [ -d "$DIR" ] && [ -w "$DIR" ]; then
    BIN="$DIR"
    break
  fi
done

if [ -z "${BIN:-}" ]; then
  BIN="$HOME/.local/bin"
  mkdir -p "$BIN"
fi

ln -sf "$SRC" "$BIN/tenfour"
chmod +x "$SRC"
echo "Linked tenfour -> $BIN/tenfour"

case ":$PATH:" in
  *":$BIN:"*) ;;
  *) echo "Note: $BIN is not on your PATH. Add:  export PATH=\"$BIN:\$PATH\"" ;;
esac

echo "Done. Try:  tenfour --version"
