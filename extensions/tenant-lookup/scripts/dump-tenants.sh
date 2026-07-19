#!/usr/bin/env bash
# Dump tenants from MongoDB into tenants.json ([{uuid,name}]) for the extension.
# Maps customers.tenant_id -> uuid, customers.name -> name.
# Requires mongosh.
#
# Usage:
#   MONGO_URI='mongodb+srv://…' DB='<database>' ./scripts/dump-tenants.sh [out.json]
#
# Env overrides (set inline, or in tenant-lookup/.env — see .env.example):
#   MONGO_URI  (required) MongoDB connection string
#   DB         (required) database name
#   COLL       (default: customers)
set -euo pipefail

# Load variables from tenant-lookup/.env if present (never committed).
# Precedence: inline/environment values > .env > defaults — so
#   MONGO_URI='…' DB='…' ./scripts/dump-tenants.sh
# still wins over values in .env. We remember what was set before sourcing and
# restore it afterwards, since `set -a; source` would otherwise clobber it.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/../.env"
if [[ -f "$ENV_FILE" ]]; then
  # Capture whether each var was SET in the environment (even if empty) and its
  # value. Using ${VAR+x} (set-test) rather than -n so an explicit VAR='' still
  # wins over .env — it then legitimately fails the required-value check below.
  _set_MONGO_URI="${MONGO_URI+x}"; _keep_MONGO_URI="${MONGO_URI:-}"
  _set_DB="${DB+x}"; _keep_DB="${DB:-}"
  _set_COLL="${COLL+x}"; _keep_COLL="${COLL:-}"
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  [ -n "$_set_MONGO_URI" ] && MONGO_URI="$_keep_MONGO_URI" || true
  [ -n "$_set_DB" ] && DB="$_keep_DB" || true
  [ -n "$_set_COLL" ] && COLL="$_keep_COLL" || true
fi

OUT="${1:-tenants.json}"
: "${MONGO_URI:?set MONGO_URI to your MongoDB connection string}"
: "${DB:?set DB to the database name}"
COLL="${COLL:-customers}"

mongosh "$MONGO_URI" --quiet --eval "
  function toUuidStr(v){
    if (v == null) return '';
    if (typeof v === 'string') return v;
    if (v._bsontype === 'Binary' && typeof v.toUUID === 'function') return v.toUUID().toString();
    return v.toString();
  }
  const rows = db.getSiblingDB('$DB').getCollection('$COLL')
    .find({}, { _id: 0, tenant_id: 1, name: 1 })
    .toArray()
    .map(d => ({ uuid: toUuidStr(d.tenant_id), name: d.name }))
    .filter(t => t.uuid && t.name)
    .sort((a, b) => a.name.localeCompare(b.name));
  print(JSON.stringify(rows, null, 2));
" > "$OUT"

python3 -c "import json; print('wrote', len(json.load(open('$OUT'))), 'tenants to $OUT')"
