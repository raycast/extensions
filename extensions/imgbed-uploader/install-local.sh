#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm is required. Install Node.js first." >&2
  exit 1
fi

RAYCAST_CONFIG="${HOME}/.config/raycast/config.json"
if [ -f "$RAYCAST_CONFIG" ] && ! node -e "JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'))" "$RAYCAST_CONFIG" >/dev/null 2>&1; then
  BACKUP_FILE="${RAYCAST_CONFIG}.bak-$(date +%Y%m%d-%H%M%S)"
  cp "$RAYCAST_CONFIG" "$BACKUP_FILE"
  printf '{}\n' >"$RAYCAST_CONFIG"
  chmod 600 "$RAYCAST_CONFIG"
  echo "Invalid Raycast CLI config was backed up to $BACKUP_FILE and reset to {}."
fi

npm install
npm run build

LOG_FILE="${TMPDIR:-/tmp}/raycast-imgbed-uploader-dev.log"
PID_FILE="${TMPDIR:-/tmp}/raycast-imgbed-uploader-dev.pid"

npm run dev >"$LOG_FILE" 2>&1 &
echo "$!" >"$PID_FILE"

sleep 3
cat "$LOG_FILE"

if ! grep -q "built extension successfully" "$LOG_FILE"; then
  echo "Raycast developer extension did not report a successful build yet." >&2
  echo "Dev process PID: $(cat "$PID_FILE")" >&2
  exit 1
fi

echo "ImgBed Uploader registered with Raycast."
