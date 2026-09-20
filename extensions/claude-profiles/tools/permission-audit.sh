#!/usr/bin/env bash
# permission-audit.sh checks where permission settings live and which enum
# values the app bundle admits. macOS only.
# See docs/session-index.md.
set -euo pipefail

APP="${1:-/Applications/Claude.app}"
ASAR="$APP/Contents/Resources/app.asar"
WORK="${TMPDIR:-/tmp}/claude_asar_audit"

echo "=== global permission settings on disk ==="
python3 - <<'PY'
import json, pathlib
s = pathlib.Path.home() / ".claude/settings.json"
try:
    d = json.loads(s.read_text())
except Exception as e:
    print(f"  {s}: unreadable ({e})")
else:
    p = d.get("permissions") or {}
    print(f"  {s}")
    print(f"    defaultMode : {p.get('defaultMode')!r}   <- base for permissionMode")
    for k in ("deny", "ask", "allow"):
        if k in p:
            print(f"    {k:12}: {len(p[k])} rule(s)")

root = pathlib.Path.home() / "Library/Application Support"
hits = 0
for cfg in list(root.glob("Claude/config.json")) + list(root.glob("Claude Profiles/*/config.json")):
    try:
        d = json.loads(cfg.read_text())
    except Exception:
        continue
    perm = {k: v for k, v in d.items() if "permission" in k.lower()}
    if perm:
        hits += 1
        print(f"  {cfg}: {perm}")
print(f"  desktop config.json files carrying a permission key: {hits}")
print("  (zero confirms chromePermissionMode has no global home)")
PY

echo
echo "=== values actually in use across every index entry ==="
python3 - <<'PY'
import json, pathlib, collections
root = pathlib.Path.home() / "Library/Application Support"
vals = collections.defaultdict(collections.Counter)
for f in root.glob("Claude*/**/claude-code-sessions/*/*/local_*.json"):
    try:
        d = json.loads(f.read_text())
    except Exception:
        continue
    for k in ("permissionMode", "chromePermissionMode"):
        if k in d:
            vals[k][json.dumps(d[k])] += 1
if not vals:
    print("  no index entries found")
for k, c in vals.items():
    print(f"  {k}")
    for v, n in c.most_common():
        print(f"      {v}  x{n}")
PY

echo
echo "=== attested enum values in the app bundle ==="
if [ ! -f "$ASAR" ]; then
  echo "  $ASAR not found; skipping"
  exit 0
fi
if [ ! -d "$WORK" ]; then
  npx --yes asar extract "$ASAR" "$WORK" 2>/dev/null || {
    echo "  could not extract app.asar (needs npx); skipping"
    exit 0
  }
fi

echo "  chromePermissionMode literals:"
grep -rhoE 'skip_all_permission_checks|always_ask' "$WORK/.vite/build/" 2>/dev/null \
  | sort | uniq -c | sort -rn | sed 's/^/    /' | head

echo "  permissionMode assignments:"
grep -rhoE '"?permissionMode"?\s*[:=]\s*"[a-zA-Z]+"' "$WORK/.vite/build/" 2>/dev/null \
  | sort -u | sed 's/^/    /' | head

echo "  mode literals present in the bundle:"
grep -rhoE '"(bypassPermissions|acceptEdits|plan|default|auto|dontAsk|ask)"' "$WORK/.vite/build/" 2>/dev/null \
  | sort | uniq -c | sort -rn | sed 's/^/    /' | head

echo
echo "  extracted bundle kept at $WORK (delete to force re-extract)"
