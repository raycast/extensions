#!/bin/sh
# measure.sh — read-only timing baseline for SPEC.md §6.5 / W-10.
# Runs the two installed helpers directly from a terminal that already holds Accessibility
# (the terminal host's grant, not Raycast's): N solo window `list` runs, N solo badge reads,
# then N concurrent pairs. Prints per-run wall time (ms), the helper's own elapsedMs where it
# reports one, and the failure count per helper. Changes nothing: the helpers only read.
#
# Usage: scripts/measure.sh [N] [window-helper path] [dock-badges path]
set -u
N=${1:-10}
W=${2:-$HOME/.config/raycast/extensions/app-management/assets/window-helper}
B=${3:-$HOME/.config/raycast/extensions/app-management/assets/dock-badges}
TMP=$(mktemp -d)
now_ms() { python3 -c 'import time; print(int(time.time()*1000))'; }
elapsed_of() { node -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(j.elapsedMs??""))}catch{process.stdout.write("")}' "$1"; }
ok_of() { node -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write((j.ok===true||j.trusted===true)?"ok":"FAIL")}catch{process.stdout.write("FAIL")}' "$1"; }

echo "helpers: $W ; $B"
echo "N=$N ; $(date -u +%Y-%m-%dT%H:%M:%SZ) ; macOS $(sw_vers -productVersion)"
echo
echo "== solo window list (wall_ms helper_elapsedMs status apps/windows)"
wf=0
i=1; while [ $i -le "$N" ]; do
  s=$(now_ms); "$W" list > "$TMP/w$i.json" 2>/dev/null; e=$(now_ms)
  st=$(ok_of "$TMP/w$i.json"); [ "$st" = ok ] || wf=$((wf+1))
  cnt=$(node -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(j.apps.length+"/"+j.windows.length)}catch{}' "$TMP/w$i.json")
  echo "  $i: $((e-s)) $(elapsed_of "$TMP/w$i.json") $st $cnt"
  i=$((i+1)); done
echo
echo "== solo badge read (wall_ms status items)"
bf=0
i=1; while [ $i -le "$N" ]; do
  s=$(now_ms); "$B" > "$TMP/b$i.json" 2>/dev/null; rc=$?; e=$(now_ms)
  st=$(ok_of "$TMP/b$i.json"); [ "$st" = ok ] && [ $rc -eq 0 ] || { st=FAIL; bf=$((bf+1)); }
  cnt=$(node -e 'try{const j=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"));process.stdout.write(String(j.apps.length))}catch{}' "$TMP/b$i.json")
  echo "  $i: $((e-s)) $st $cnt"
  i=$((i+1)); done
echo
echo "== concurrent pairs (window wall_ms / badge wall_ms / pair wall_ms ; statuses)"
cwf=0; cbf=0
i=1; while [ $i -le "$N" ]; do
  s=$(now_ms)
  ( s1=$(now_ms); "$W" list > "$TMP/cw$i.json" 2>/dev/null; e1=$(now_ms); echo $((e1-s1)) > "$TMP/cw$i.t" ) &
  ( s2=$(now_ms); "$B" > "$TMP/cb$i.json" 2>/dev/null; e2=$(now_ms); echo $((e2-s2)) > "$TMP/cb$i.t" ) &
  wait; e=$(now_ms)
  sw=$(ok_of "$TMP/cw$i.json"); [ "$sw" = ok ] || cwf=$((cwf+1))
  sb=$(ok_of "$TMP/cb$i.json"); [ "$sb" = ok ] || cbf=$((cbf+1))
  echo "  $i: $(cat "$TMP/cw$i.t") (helper $(elapsed_of "$TMP/cw$i.json")) / $(cat "$TMP/cb$i.t") / $((e-s)) ; $sw $sb"
  i=$((i+1)); done
echo
echo "failures: window solo $wf/$N, badge solo $bf/$N, window concurrent $cwf/$N, badge concurrent $cbf/$N"
rm -rf "$TMP"
