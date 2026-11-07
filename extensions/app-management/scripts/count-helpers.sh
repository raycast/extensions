#!/bin/sh
# count-helpers.sh — read-only observation for H-5, Q-1, I-2: polls `pgrep` every 10 ms for the two helper
# binaries and prints one line per distinct helper process seen (pid, name, first-seen time), plus totals.
# Usage: scripts/count-helpers.sh <seconds> [interval-seconds, default 0.01]
set -u
SECS=${1:-30}; INT=${2:-0.01}
END=$(( $(date +%s) + SECS ))
SEEN=""
W=0; B=0
while [ "$(date +%s)" -lt "$END" ]; do
  for line in $(pgrep -l -f "assets/(window-helper|dock-badges)" 2>/dev/null | tr ' ' '#'); do
    pid=${line%%#*}
    case "$SEEN" in *"|$pid|"*) continue;; esac
    SEEN="$SEEN|$pid|"
    case "$line" in *window-helper*) W=$((W+1)); n=window-helper;; *) B=$((B+1)); n=dock-badges;; esac
    folder=$(printf '%s' "$line" | sed -E 's#.*/extensions/([^/]+)/assets/.*#\1#')
    echo "$(date +%H:%M:%S.%N | cut -c1-12) pid $pid $folder $n"
  done
  sleep "$INT"
done
echo "total: window-helper $W, dock-badges $B (over ${SECS}s)"
