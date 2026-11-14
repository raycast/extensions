#!/usr/bin/env bash
# Verifies that the current user may release this extension to the Raycast Store.
# A guardrail for humans and Claude, not a security boundary: the real protection is that
# only the maintainer can push to this repository and publish as the extension's author.
set -euo pipefail

REPO="macx/raycast-dashboard-icons"
AUTHOR="macx"

fail() {
  echo "Release not allowed: $1" >&2
  echo "Only maintainers of https://github.com/$REPO can release. Contributors: open a pull request instead." >&2
  exit 1
}

cd "$(dirname "$0")/.."

command -v gh >/dev/null || fail "GitHub CLI (gh) is not installed."
login="$(gh api user --jq .login 2>/dev/null)" || fail "not signed in to GitHub CLI (run: gh auth login)."

admin="$(gh api "repos/$REPO" --jq '.permissions.admin // false' 2>/dev/null || echo false)"
[ "$admin" = "true" ] || fail "GitHub user '$login' is not an admin of $REPO."

origin="$(git remote get-url origin 2>/dev/null || true)"
case "$origin" in
  *"github.com/$REPO"* | *"github.com:$REPO"*) ;;
  *) fail "git remote 'origin' is '$origin', expected $REPO (releases are made from the main repository, not a fork)." ;;
esac

manifest_author="$(node -p "require('./package.json').author")"
[ "$manifest_author" = "$AUTHOR" ] || fail "package.json author is '$manifest_author', expected '$AUTHOR'."

branch="$(git rev-parse --abbrev-ref HEAD)"
[ "$branch" = "main" ] || fail "current branch is '$branch', releases are made from 'main'."

[ -z "$(git status --porcelain)" ] || fail "working tree has uncommitted changes."

git fetch --quiet origin main
[ "$(git rev-parse HEAD)" = "$(git rev-parse origin/main)" ] || fail "local main differs from origin/main (push or pull first)."

echo "OK: $login is a maintainer of $REPO; main is clean and in sync."
