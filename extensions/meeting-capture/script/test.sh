#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRATCH_DIR="$(mktemp -d /tmp/meeting-capture-tests.XXXXXX)"
trap '/bin/rm -rf "$SCRATCH_DIR"' EXIT

cd "$ROOT_DIR"
swift test --scratch-path "$SCRATCH_DIR"
node script/check-manifest.mjs
