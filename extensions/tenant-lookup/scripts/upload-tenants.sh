#!/usr/bin/env bash
# Upload a local tenants.json to the private S3 bucket the extension reads.
# Requires an active AWS SSO session for a profile with write access (e.g. prod-admin).
#
# Usage:
#   ./scripts/upload-tenants.sh [path-to-json]
#
# Env overrides (set inline, or in tenant-lookup/.env — see .env.example):
#   BUCKET   (default: orion-internal-tenant-lookup)
#   KEY      (default: tenants.json)
#   PROFILE  (default: prod-admin)
set -euo pipefail

# Load variables from tenant-lookup/.env if present (never committed).
# Precedence: inline/environment values > .env > defaults — so
#   PROFILE=prod-admin ./scripts/upload-tenants.sh
# still wins over values in .env. We remember what was set before sourcing and
# restore it afterwards, since `set -a; source` would otherwise clobber it.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [[ -f "$ENV_FILE" ]]; then
  # Capture whether each var was SET in the environment (even if empty) and its
  # value. Using ${VAR+x} (set-test) rather than -n so an explicit VAR='' still
  # wins over .env.
  _set_BUCKET="${BUCKET+x}"; _keep_BUCKET="${BUCKET:-}"
  _set_KEY="${KEY+x}"; _keep_KEY="${KEY:-}"
  _set_PROFILE="${PROFILE+x}"; _keep_PROFILE="${PROFILE:-}"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  [ -n "$_set_BUCKET" ] && BUCKET="$_keep_BUCKET" || true
  [ -n "$_set_KEY" ] && KEY="$_keep_KEY" || true
  [ -n "$_set_PROFILE" ] && PROFILE="$_keep_PROFILE" || true
fi

FILE="${1:-tenants.json}"
BUCKET="${BUCKET:-orion-internal-tenant-lookup}"
KEY="${KEY:-tenants.json}"
PROFILE="${PROFILE:-prod-admin}"

if [[ ! -f "$FILE" ]]; then
  echo "error: file not found: $FILE" >&2
  exit 1
fi

# Fail early with a clear message if the JSON is malformed.
if ! python3 -c "import json,sys; json.load(open('$FILE'))" 2>/dev/null; then
  echo "error: $FILE is not valid JSON" >&2
  exit 1
fi

echo "Uploading $FILE -> s3://$BUCKET/$KEY (profile: $PROFILE)"
aws s3 cp "$FILE" "s3://$BUCKET/$KEY" \
  --profile "$PROFILE" \
  --content-type application/json

echo "Done."
