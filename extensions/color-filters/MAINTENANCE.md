# Maintenance Guide

This extension was built with **Claude Code** on **macOS Tahoe (26.x)** in **January 2026**.

## Architecture

The extension uses AppleScript UI automation to control System Settings. It does NOT quit System Settings between commands, keeping it running in the background for faster subsequent calls (~200ms vs ~1400ms).

### Performance Optimization

**Original approach (slow):**
1. Quit System Settings
2. Wait for quit
3. Open System Settings
4. Wait for window (1064ms cold start!)
5. Click UI element
6. Quit System Settings

**Optimized approach (fast):**
1. Open URL (navigates whether running or not)
2. Wait for window (~29ms if already running)
3. Click UI element
4. Hide window (set visible to false)

## UI Element Paths

The extension relies on **hardcoded UI element paths** that are specific to macOS 26.x System Settings layout:

```applescript
CHECKBOX_PATH = "checkbox 1 of group 5 of scroll area 1 of group 1 of group 3 of splitter group 1 of group 1 of window 1"
POPUP_PATH = "pop up button 1 of group 5 of scroll area 1 of group 1 of group 3 of splitter group 1 of group 1 of window 1"
```

### Why These Paths Break

Apple frequently changes System Settings UI structure between macOS versions:
- Group nesting order changes
- New UI elements get inserted
- Existing elements move to different groups

## How to Fix After macOS Update

### Step 1: Verify the Extension Still Works

```bash
# Test toggle command
/Users/tj/.local/bin/color-filter toggle

# If you get an AppleScript error about UI elements, proceed to Step 2
```

### Step 2: Capture New UI Hierarchy

```bash
# Open System Settings to the correct pane
open 'x-apple.systempreferences:com.apple.preference.universalaccess?Seeing_Display'

# Dump the entire UI structure
osascript -e 'tell application "System Events" to tell process "System Settings" to get entire contents of window 1' > ~/Desktop/system-settings-ui.txt
```

### Step 3: Find the Color Filters Elements

Open `~/Desktop/system-settings-ui.txt` and search for:

1. **Checkbox**: Look for text containing "Color Filters" - this is the on/off toggle
2. **Popup Button**: Look for the filter type selector (usually near the checkbox)

Example output format:
```
checkbox "Color Filters" of group 5 of scroll area 1 of ...
pop up button 1 of group 5 of scroll area 1 of ...
```

### Step 4: Build the New Paths

The path format in AppleScript is reverse of what you see:
- Output: `checkbox "Color Filters" of group 5 of scroll area 1 of group 1`
- Path: `checkbox 1 of group 5 of scroll area 1 of group 1`

**Important**: Replace named references with numeric indices:
- `checkbox "Color Filters"` → `checkbox 1` (if it's the first checkbox in that group)
- Always end with `of window 1`

### Step 5: Update the Code

Update these files with the new paths:

1. **Raycast Extension:**
   - File: `src/color-filters.ts`
   - Lines: ~35-36
   - Update: `CHECKBOX_PATH` and `POPUP_PATH`

2. **CLI Tool:**
   - File: `/Users/tj/.local/bin/color-filter`
   - Lines: ~8-9
   - Update: `CHECKBOX_PATH` and `POPUP_PATH`

### Step 6: Test

```bash
# Test CLI tool
/Users/tj/.local/bin/color-filter toggle

# Rebuild Raycast extension
cd /Users/tj/TJDevelopment/color-filters-raycast
npm run build

# Reload in Raycast (⌘⇧R)
```

## Alternative Debugging Approach

If you need to test paths interactively:

```bash
# Test checkbox click
osascript <<EOF
tell application "System Events"
  tell process "System Settings"
    click checkbox 1 of group 5 of scroll area 1 of group 1 of group 3 of splitter group 1 of group 1 of window 1
  end tell
end tell
EOF
```

Adjust the path until the click works, then update the code.

## Delay Tuning

If the extension becomes unreliable after an update, you may need to adjust delays:

**In `src/color-filters.ts`:**
- Line ~90: `delay 0.05` - Window polling interval
- Line ~94: `delay 0.1` - Wait after window appears

**In `/Users/tj/.local/bin/color-filter`:**
- Line ~76: `delay 0.05` - Window polling interval
- Line ~79: `delay 0.3` - Wait after window appears (CLI uses longer delay)

Increase these if clicks fail intermittently.

## Testing Checklist

After any changes:

- [ ] `npm run lint` passes
- [ ] `npm run build` succeeds
- [ ] Toggle works from Raycast
- [ ] Set filter works from Raycast
- [ ] Select filter list works from Raycast
- [ ] CLI toggle works: `color-filter toggle`
- [ ] CLI set filter works: `color-filter set grayscale`
- [ ] System Settings window hides after action
- [ ] Subsequent calls are fast (~200ms)

## Future Improvements

Consider these alternatives to UI automation:

1. **Private Framework API**: Use MediaAccessibility framework directly (requires reverse engineering)
2. **Shell Scripting**: Use `defaults write` commands (may not work for all filter types)
3. **Native Swift Extension**: Build a native helper app using private APIs

## Built With

- **Claude Code** - AI-assisted development
- **AppleScript** - UI automation
- **Raycast API** - Extension framework
- **Performance Analysis** - Timing measurements to eliminate quit/reopen cycle

Last updated: 2026-01-29
