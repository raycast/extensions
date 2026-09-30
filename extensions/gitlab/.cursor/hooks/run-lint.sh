#!/usr/bin/env bash
# Run project lint after agent file edits (project hooks cwd = repo root).
set -euo pipefail

if [[ ! -f package.json ]] || ! grep -q '"lint"' package.json 2>/dev/null; then
  exit 0
fi

# Consume hook stdin (schema may include edited file metadata).
cat >/dev/null 2>&1 || true

echo "Running npm run lint after file edit..." >&2
npm run lint >&2 || {
  echo "lint finished with errors (see output above)" >&2
  exit 0
}

exit 0
