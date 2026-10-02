#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRATCH_DIR="$(mktemp -d /tmp/meeting-capture-tests.XXXXXX)"
trap '/bin/rm -rf "$SCRATCH_DIR"' EXIT

cd "$ROOT_DIR"
swift test --scratch-path "$SCRATCH_DIR"
node script/check-manifest.mjs

npx --no-install tsc src/capture-wait.ts --target ES2022 --module NodeNext --skipLibCheck --outDir "$SCRATCH_DIR/js"
printf '{"type":"module"}\n' > "$SCRATCH_DIR/js/package.json"
node script/test-capture-wait.mjs "$SCRATCH_DIR/js/capture-wait.js"
