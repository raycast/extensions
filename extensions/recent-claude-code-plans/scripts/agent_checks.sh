#!/usr/bin/env bash
# agent_checks.sh - Context-efficient checks for AI agents
# Inspired by: https://www.hlyr.dev/blog/context-efficient-backpressure
#
# Runs: typecheck → lint:fix
# On success: shows ✓ with summary
# On failure: shows only relevant output

set -e

# Change to repo root (script is in scripts/ directory)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

run_check() {
    local name="$1"
    local cmd="$2"
    local tmp_file
    tmp_file=$(mktemp)

    if eval "$cmd" > "$tmp_file" 2>&1; then
        echo "✓ $name"
        rm -f "$tmp_file"
        return 0
    else
        echo "✗ $name"
        echo "Command: $cmd"
        echo "---"
        cat "$tmp_file"
        rm -f "$tmp_file"
        return 1
    fi
}

echo "Running agent checks..."
run_check "typecheck" "npm run typecheck"
run_check "lint:fix" "npm run lint:fix"
echo "All checks passed ✓"
