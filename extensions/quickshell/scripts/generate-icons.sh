#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REPO="$(cd "$ROOT/.." && pwd)"
SCRIPT="$REPO/QuickShell/Assets/raycast/export-raycast-icons.ps1"

if [[ ! -f "$SCRIPT" ]]; then
  echo "Missing export script: $SCRIPT" >&2
  exit 1
fi

if command -v pwsh >/dev/null 2>&1; then
  pwsh -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT"
elif command -v powershell >/dev/null 2>&1; then
  powershell -NoProfile -ExecutionPolicy Bypass -File "$SCRIPT"
else
  echo "PowerShell is required to regenerate Raycast icons." >&2
  exit 1
fi

echo "Generated Raycast icons in $ROOT/assets"
