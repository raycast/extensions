#!/bin/bash
# AI code review against CLAUDE.md guidelines.
# Runs as a pre-commit hook via husky.
# Skips gracefully if the claude CLI is not installed.

set -euo pipefail

if ! command -v claude &>/dev/null; then
  echo "AI review skipped (claude CLI not found)"
  exit 0
fi

STAGED_DIFF=$(git diff --cached --diff-filter=ACMR -- '*.ts' '*.tsx')

if [ -z "$STAGED_DIFF" ]; then
  exit 0
fi

REPO_ROOT=$(git rev-parse --show-toplevel)

# Build prompt in a temp file to avoid shell quoting issues with large content
PROMPT_FILE=$(mktemp)
trap 'rm -f "$PROMPT_FILE"' EXIT

cat > "$PROMPT_FILE" <<'PROMPT_END'
You are a code reviewer. Review the diff below against the project's CLAUDE.md guidelines (provided after the diff).

Focus ONLY on things a linter cannot catch:
- Poor or generic naming (tmp, str, obj, retval, get, data, etc.)
- Missing explaining variables (complex inline expressions that should be named)
- YAGNI violations (unnecessary parameters, premature abstractions, speculative code)
- Functions doing too many things (should be split)
- Commented-out code that should be deleted
- Missing boolean prefixes (is, has, can) on boolean variables

Do NOT flag:
- Formatting or style (handled by Prettier)
- Unused variables or imports (handled by ESLint)
- Type issues (handled by TypeScript)
- Anything already enforced by a linter

If everything looks good, respond with exactly: LGTM

Otherwise, list each suggestion as:
FILE:LINE - description

Be concise. Only flag clear violations, not subjective preferences.

--- DIFF ---
PROMPT_END

# Append diff and CLAUDE.md (if present) directly via redirection (avoids shell variable expansion)
git diff --cached --diff-filter=ACMR -- '*.ts' '*.tsx' >> "$PROMPT_FILE"
CLAUDE_MD="$HOME/.claude/CLAUDE.md"
if [ -f "$CLAUDE_MD" ]; then
  printf '\n--- CLAUDE.MD ---\n' >> "$PROMPT_FILE"
  cat "$CLAUDE_MD" >> "$PROMPT_FILE"
fi

# Read prompt into a variable first, then pass to claude
# (avoids nested $() which can misparse backticks in bash 3.2)
FULL_PROMPT=$(cat "$PROMPT_FILE")

echo "Running AI review..."

REVIEW=$(claude -p "$FULL_PROMPT" 2>/dev/null) || {
  echo "AI review skipped (claude command failed)"
  exit 0
}

if echo "$REVIEW" | grep -qi "^LGTM$"; then
  echo "AI review passed"
  exit 0
fi

echo ""
echo "AI Review Suggestions:"
echo "─────────────────────"
echo "$REVIEW"
echo "─────────────────────"
echo ""
echo 'Fix the suggestions above, or use "git commit --no-verify" to skip.'
exit 1
