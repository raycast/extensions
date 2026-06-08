#!/usr/bin/env bash
# Shared config for Phase 1 feasibility spikes.
# Edit these to match your setup, then re-run the spike scripts.

# Discord Stable desktop bundle ID (MVP target). PTB: com.hnc.Discord.ptb  Canary: com.hnc.Discord.canary
DISCORD_BUNDLE_ID="com.hnc.Discord"
DISCORD_APP_NAME="Discord"

# In-app keybinds (only fire while Discord is focused). Defaults from the user + Discord defaults.
# Format is AppleScript "keystroke" + modifiers. We encode the *character* and the modifier list.
MUTE_KEY="m"            # Cmd+Shift+M  -> toggle mute
DEAFEN_KEY="d"          # Cmd+Shift+D  -> toggle deafen
# Modifiers applied to the keystrokes above (AppleScript modifier names, comma separated):
KEY_MODIFIERS="command down, shift down"

# Set to "global" if you later configure Discord *global* keybinds (fire without focusing Discord).
# Set to "inapp" (default) to test the activate->key->restore-focus flow.
KEYBIND_MODE="inapp"
