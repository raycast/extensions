#!/bin/bash
# Unit and integration tests (node:test) on Raycast's Node. Pass file paths to run a subset.
set -euo pipefail
cd "$(dirname "$0")/.."
if [[ $# -gt 0 ]]; then FILES=("$@"); else FILES=($(find test -name '*.test.ts' | sort)); fi
exec bash scripts/run-node.sh --test --test-concurrency=1 "${FILES[@]}"
