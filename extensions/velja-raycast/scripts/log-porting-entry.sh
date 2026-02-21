#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 4 ]; then
  echo "Usage: $(basename "$0") <source-sha> <upstream-branch> <upstream-sha> <pr-url> [notes]" >&2
  exit 1
fi

SOURCE_SHA="$1"
UPSTREAM_BRANCH="$2"
UPSTREAM_SHA="$3"
PR_URL="$4"
NOTES="${5:-}"

REPO_ROOT="$(git rev-parse --show-toplevel)"
LEDGER="$REPO_ROOT/porting-ledger.tsv"
SOURCE_REPO="$(basename "$REPO_ROOT")"
SOURCE_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
NOW_UTC="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

printf '%s\t%s\t%s\t%s\t%s\t%s\t%s\t%s\n' \
  "$NOW_UTC" "$SOURCE_REPO" "$SOURCE_BRANCH" "$SOURCE_SHA" "$UPSTREAM_BRANCH" "$UPSTREAM_SHA" "$PR_URL" "$NOTES" >> "$LEDGER"

echo "Logged mapping to $LEDGER"
