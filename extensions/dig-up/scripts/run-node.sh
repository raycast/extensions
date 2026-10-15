#!/bin/bash
# Runs a TypeScript file with Raycast's own Node (the runtime the extension ships on), falling back to `node`.
# Usage: scripts/run-node.sh [node flags...] file.ts [args...]
set -euo pipefail
RAYCAST_NODE=$(ls -d "$HOME/Library/Application Support/com.raycast.macos/node/runtime"/node-*/bin/node 2>/dev/null | sort -V | tail -1 || true)
NODE="${DIGUP_NODE:-${RAYCAST_NODE:-node}}"
exec "$NODE" --no-warnings=ExperimentalWarning --import tsx "$@"
