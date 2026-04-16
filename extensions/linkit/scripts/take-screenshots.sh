#!/usr/bin/env bash
# take-screenshots.sh — Capture LinkIt Raycast extension screenshots for store submission
#
# REQUIREMENTS:
#   1. npm run dev running in a separate terminal
#   2. Raycast Window Capture configured (Raycast Prefs → Advanced → Window Capture hotkey)
#   3. "Save to Metadata" checkbox enabled in Window Capture settings
#
# OUTPUT: Saves 2000x1250 PNGs directly into assets/metadata/ (Raycast's convention).
# Raycast Window Capture is the ONLY way to produce correctly sized store screenshots.
#
# Usage:
#   bash scripts/take-screenshots.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
METADATA_DIR="$PROJECT_DIR/assets/metadata"

mkdir -p "$METADATA_DIR"

echo "LinkIt Screenshot Capture"
echo "========================="
echo ""
echo "Prerequisites:"
echo "  1. npm run dev is running in another terminal"
echo "  2. Raycast → Settings → Advanced → Window Capture hotkey is set"
echo "     (e.g. Cmd+Shift+Opt+S)"
echo "  3. 'Save to Metadata' is checked in Window Capture"
echo ""
echo "When Window Capture runs, it saves to:"
echo "  <extension-dir>/assets/metadata/"
echo "  → $METADATA_DIR"
echo ""

# ── helpers ──────────────────────────────────────────────────────────────────

set_clipboard() {
  osascript -e "set the clipboard to \"$1\""
}

open_linkit() {
  open "raycast://extensions/avital_ben_natan/linkit/index"
}

wait_for_raycast_window() {
  local max="${1:-12}"
  local i=0
  while [ "$i" -lt "$max" ]; do
    local n
    n=$(osascript -e 'tell application "System Events" to tell process "Raycast" to count windows' 2>/dev/null || echo 0)
    [ "$n" -gt 0 ] 2>/dev/null && return 0
    sleep 1
    i=$((i + 1))
  done
  echo "⚠️  Raycast window did not appear within ${max}s" >&2
  return 1
}

dismiss_raycast() {
  osascript -e 'tell application "System Events" to key code 53' 2>/dev/null || true
  sleep 0.4
}

# ── screenshot sequences ──────────────────────────────────────────────────────

screenshot_results() {
  echo "── Screenshot 1: Search results list ──────────────────────────────"
  echo "   Query: 'markdown link format best practices'"
  echo ""
  echo "   Steps:"
  echo "   1. Raycast will open with search results"
  echo "   2. Wait for results to load (~5s)"
  echo "   3. Press your Window Capture hotkey (ensure 'Save to Metadata' checked)"
  echo ""
  read -rp "   Press Enter to open Raycast..." _

  set_clipboard "markdown link format best practices"
  sleep 0.2
  open_linkit
  wait_for_raycast_window 12

  echo ""
  echo "   ✓ Raycast is open. Waiting 6s for search results..."
  sleep 6

  echo "   → NOW press your Window Capture hotkey."
  read -rp "   Press Enter when screenshot is taken..." _
  dismiss_raycast
  echo ""
}

screenshot_selected() {
  echo "── Screenshot 2: Result selected (with selection indicator) ────────"
  echo "   Query: 'raycast extension development guide'"
  echo ""
  echo "   Steps:"
  echo "   1. Raycast opens with results"
  echo "   2. Wait for results, then press Opt+Space to select first result"
  echo "   3. Press Window Capture hotkey"
  echo ""
  read -rp "   Press Enter to open Raycast..." _

  set_clipboard "raycast extension development guide"
  sleep 0.2
  open_linkit
  wait_for_raycast_window 12

  echo ""
  echo "   ✓ Raycast is open. Waiting 6s for search results..."
  sleep 6

  echo "   → Press Opt+Space to select the first result, then your Window Capture hotkey."
  read -rp "   Press Enter when screenshot is taken..." _
  dismiss_raycast
  echo ""
}

# ── main ─────────────────────────────────────────────────────────────────────

read -rp "Press Enter when ready (or Ctrl+C to abort)..." _
echo ""

screenshot_results
screenshot_selected

echo "Done!"
echo ""
echo "Screenshots should be in:"
echo "  $METADATA_DIR"
echo ""
ls -1 "$METADATA_DIR" 2>/dev/null || echo "  (directory is empty — check that 'Save to Metadata' was enabled)"
