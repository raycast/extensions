#!/usr/bin/env bash
# Convenience runner for the Phase 1 feasibility spikes.
# Runs the non-destructive probes (detection, RPC read, UI inspect) automatically,
# then guides you through the manual toggle proofs that need your eyes on Discord.

set -uo pipefail
SPIKE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SPIKE_DIR/lib.sh"

echo "=================================================================="
echo " PHASE 1 FEASIBILITY SPIKE  (Discord Stable, bundle $DISCORD_BUNDLE_ID)"
echo "=================================================================="
echo
echo "Discord running:        $(discord_is_running && echo yes || echo no)"
echo "Bundle id detected:     $(bundle_id_running && echo yes || echo no)"
echo "Frontmost app now:      $(frontmost_app)"
echo "Keybind mode:           $KEYBIND_MODE"
echo

echo "### 1/3  RPC IPC read-only spike -------------------------------"
node "$SPIKE_DIR/03-rpc-read.mjs"
echo

echo "### 2/3  UI automation accessibility inspect -------------------"
bash "$SPIKE_DIR/02-ui-automation.sh" inspect
echo

echo "### 3/3  Shortcut dispatch (MANUAL — watch Discord) ------------"
echo "These flip real state. Run them yourself and record by eye:"
echo "    bash $SPIKE_DIR/01-shortcut-dispatch.sh mute"
echo "    bash $SPIKE_DIR/01-shortcut-dispatch.sh deafen"
echo "    bash $SPIKE_DIR/01-shortcut-dispatch.sh no-discord-check   # after quitting Discord"
echo
echo "Paste every [RESULT] line above into vibe/phases/phase-01-results/manual-test-notes.md"
