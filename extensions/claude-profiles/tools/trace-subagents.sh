#!/usr/bin/env bash
# trace-subagents.sh checks how a transcript links to its subagent
# sidechains. macOS only.
# See docs/session-storage.md.
set -euo pipefail

CLI_PROJECTS="$HOME/.claude/projects"
APP_SUPPORT="$HOME/Library/Application Support"

usage() {
  cat <<'EOF'
Usage:
  trace-subagents.sh [transcript.jsonl]

With no argument, picks the transcript that has the most sidechains.
EOF
}

case "${1:-}" in
  -h|--help) usage; exit 0 ;;
esac

PARENT="${1:-}"

if [ -z "$PARENT" ]; then
  PARENT="$(
    for f in "$CLI_PROJECTS"/*/*.jsonl; do
      [ -f "$f" ] || continue
      d="${f%.jsonl}/subagents"
      [ -d "$d" ] || continue
      n="$(find "$d" -name '*.jsonl' | wc -l | tr -d ' ')"
      printf '%s\t%s\n' "$n" "$f"
    done | sort -rn | head -1 | cut -f2
  )"
fi

if [ -z "$PARENT" ] || [ ! -f "$PARENT" ]; then
  echo "no transcript with sidechains found" >&2
  exit 1
fi

AGENTS="${PARENT%.jsonl}/subagents"

echo "parent    : $PARENT"
echo "sidechains: $(find "$AGENTS" -name '*.jsonl' 2>/dev/null | wc -l | tr -d ' ')"
echo

echo "=== do any desktop index entries point at a sidechain? ==="
FOUND=0
for f in "$APP_SUPPORT"/Claude*/claude-code-sessions/*/*/local_*.json \
         "$APP_SUPPORT"/Claude\ Profiles/*/claude-code-sessions/*/*/local_*.json; do
  [ -f "$f" ] || continue
  FOUND=1
  python3 -c '
import json, sys
d = json.load(open(sys.argv[1]))
print("  %s  %s" % (d.get("cliSessionId", "?"), d.get("title", "")[:44]))' "$f"
done
[ "$FOUND" -eq 1 ] || echo "  (no index entries found)"
echo "  Compare these ids against the sidechain filenames below: no overlap"
echo "  means the app never indexes a sidechain."
echo

echo "=== sidechain shape ==="
CHILD="$(find "$AGENTS" -name '*.jsonl' 2>/dev/null | head -1)"
if [ -n "$CHILD" ]; then
  echo "  file: $(basename "$CHILD")"
  head -1 "$CHILD" | python3 -c '
import json, sys
d = json.load(sys.stdin)
for k in ("agentId","sessionId","isSidechain","sessionKind","promptId","parentUuid","cwd"):
    if k in d:
        print(f"    {k:14} {d[k]!r}")'
fi
echo

echo "=== the promptId that joins parent to sidechain ==="
if [ -n "$CHILD" ]; then
  PID="$(head -1 "$CHILD" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("promptId",""))')"
  if [ -n "$PID" ]; then
    echo "  promptId $PID"
    echo "  lines carrying it in the parent  : $(grep -c "$PID" "$PARENT" || echo 0)"
    echo "  lines carrying it in the sidechain: $(grep -c "$PID" "$CHILD" || echo 0)"
    echo
    echo "  A shared promptId across both files is the join the app uses to"
    echo "  nest the agent's work under the parent turn that spawned it."
  fi
fi
