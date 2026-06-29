#!/usr/bin/env bash
#
# Upload the static Wojak bundle (deploy/dist) to your VPS web root via rsync over SSH.
#
# Prereqs:
#   - Run `WOJAK_BASE_URL=https://your-domain node scripts/build-deploy.js` first.
#   - SSH access to the VPS (key-based recommended).
#   - Nginx configured with root /var/www/wojaks (see deploy/nginx-wojaks.conf).
#
# Usage:
#   VPS_HOST=user@1.2.3.4 ./scripts/deploy-vps.sh
#   VPS_HOST=user@1.2.3.4 VPS_PATH=/var/www/wojaks ./scripts/deploy-vps.sh
#
# Env:
#   VPS_HOST   (required) ssh target, e.g. deploy@wojaks.example.com
#   VPS_PATH   (optional) remote web root. Default /var/www/wojaks
#   SSH_PORT   (optional) ssh port. Default 22
#   DELETE     (optional) "1" to delete remote files not present locally. Default 0.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DIST_DIR="$(cd "$SCRIPT_DIR/.." && pwd)/deploy/dist"

VPS_HOST="${VPS_HOST:-}"
VPS_PATH="${VPS_PATH:-/var/www/wojaks}"
SSH_PORT="${SSH_PORT:-22}"
DELETE="${DELETE:-0}"

if [[ -z "$VPS_HOST" ]]; then
  echo "Set VPS_HOST, e.g. VPS_HOST=deploy@wojaks.example.com ./scripts/deploy-vps.sh" >&2
  exit 1
fi

if [[ ! -d "$DIST_DIR/images" || ! -f "$DIST_DIR/wojaks.json" ]]; then
  echo "deploy/dist is missing or incomplete. Run scripts/build-deploy.js first." >&2
  exit 1
fi

RSYNC_FLAGS=(-avz --human-readable --progress -e "ssh -p ${SSH_PORT}")
if [[ "$DELETE" == "1" ]]; then
  RSYNC_FLAGS+=(--delete)
fi

echo "Ensuring remote path ${VPS_PATH} exists..."
ssh -p "${SSH_PORT}" "${VPS_HOST}" "mkdir -p '${VPS_PATH}/images' '${VPS_PATH}/thumbs'"

echo "Syncing thumbnails..."
rsync "${RSYNC_FLAGS[@]}" "$DIST_DIR/thumbs/" "${VPS_HOST}:${VPS_PATH}/thumbs/"

echo "Syncing full images..."
rsync "${RSYNC_FLAGS[@]}" "$DIST_DIR/images/" "${VPS_HOST}:${VPS_PATH}/images/"

echo "Syncing manifest..."
rsync "${RSYNC_FLAGS[@]}" "$DIST_DIR/wojaks.json" "${VPS_HOST}:${VPS_PATH}/wojaks.json"

echo "Done. Verify:  curl -sI \$WOJAK_BASE_URL/wojaks.json"
