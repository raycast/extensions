#!/bin/sh
# Plays Kokoro TTS audio segments in order as they are written to disk.
#
# The Raycast command streams the synthesised audio segment-by-segment and
# drops each one here as "<prefix>-<n>.wav" plus an empty "<prefix>-<n>.wav.ready"
# marker (written last, so a half-written file is never played). When no more
# segments are coming it writes "<prefix>.done".
#
# This script is spawned detached so playback survives after the short-lived
# Raycast command process exits. Argument: the session file prefix.
prefix="$1"
[ -n "$prefix" ] || exit 1

n=0
while :; do
  segment="${prefix}-${n}.wav"
  if [ -f "${segment}.ready" ]; then
    afplay "$segment" 2>/dev/null
    rm -f "$segment" "${segment}.ready"
    n=$((n + 1))
    continue
  fi
  if [ -f "${prefix}.done" ]; then
    break
  fi
  sleep 0.05
done

rm -f "${prefix}.done"
