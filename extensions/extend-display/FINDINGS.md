# AirPlay Display Connection - Debugging Findings

## Goal
Create a Raycast extension to quickly connect to an AirPlay display (another Mac) while preserving audio output.

## Environment
- **macOS Version**: 26.2 (Tahoe) - Build 25C56
- **Target Display**: "Pavzagor MacBook Pro 14"

## What Works
1. **SwitchAudioSource** is installed at `/opt/homebrew/bin/SwitchAudioSource` - audio preservation should work
2. **Manual connection works** - clicking the display in System Settings UI successfully connects
3. **Extension builds successfully** with `bun x @raycast/api build`

## Key Findings

### 1. Apple Has No Public API for AirPlay Display Connections
- Searched Apple Developer Documentation via MCP
- Found `AVRoutePickerView` - only shows a picker UI, no programmatic selection
- `UIScreen` APIs are for managing content ON displays, not initiating connections
- Private frameworks like `AirPlaySender.framework` exist but are undocumented

### 2. System Settings > Displays UI Structure (macOS Tahoe)

```
Window "Displays"
└── group 1
    └── splitter group 1
        ├── group 1 (sidebar)
        ├── group 2 (?)
        └── group 3 (main content)
            └── group 1
                ├── scroll area 1 "Displays" - contains 1 button (display overview)
                ├── menu button "Display settings for Built-in Display"
                └── scroll area 2 "Display settings for Built-in Display"
                    ├── group 1-5 (resolution, brightness, etc.)
                    └── buttons
```

### 3. "Mirror or extend to" Section
- Visible in UI as a floating panel in bottom-right corner
- **NOT accessible via standard AppleScript accessibility APIs**
- No elements containing "Mirror", "extend", or the display name found
- No static text elements enumerated
- Appears to be rendered differently (possibly native graphics, not standard UI elements)

### 4. Control Center Has Screen Mirroring
- Menu bar item index 30: `desc=Screen Mirroring`
- This is a more promising avenue for automation
- Located in `ControlCenter` process menu bar

### 5. Previous AppleScript Approach
The first version of the script (targeting a dropdown menu) actually worked - it:
1. Opened System Settings
2. Found the dropdown
3. Located the display name
4. Clicked it

But macOS showed "Could not connect" error, while manual clicking worked. This suggests:
- AppleScript `click` events may be processed differently than real mouse clicks
- Timing or focus issues may prevent proper connection

## Approaches to Try Next

### 1. Screen Mirroring via Control Center (Most Promising)
```applescript
tell application "System Events"
  tell process "ControlCenter"
    click menu bar item 30 of menu bar 1 -- Screen Mirroring
    -- Then explore the resulting window/popover
  end tell
end tell
```

### 2. Keyboard Navigation
- Open System Settings > Displays
- Use Tab key to navigate to the display target
- Use Enter/Space to activate

### 3. Coordinate-based Clicking
- Use `click at {x, y}` with known coordinates
- Less reliable across screen sizes/resolutions

### 4. Alternative Tools
- **cliclick** - command-line tool for mouse clicks
- **Hammerspoon** - Lua-based automation
- **BetterDisplay CLI** - may support AirPlay (needs Pro license investigation)

## Code Location
- Main extension: `src/connect-to-display.tsx`
- Quick connect: `src/quick-connect.tsx`  
- Connection logic: `src/utils/connect.ts`
- Display discovery: `src/utils/displays.ts`
- Audio management: `src/utils/audio.ts`
- Dependencies check: `src/utils/deps.ts`

## Next Steps
1. Try the Control Center Screen Mirroring approach
2. If that fails, try keyboard navigation
3. As a last resort, investigate coordinate-based clicking or third-party tools

## Latest Debug Findings (macOS Tahoe 26.2)

### Control Center: Screen Mirroring Panel Exists but Names Are Hidden
- **Screen Mirroring checkbox is discoverable by AXIdentifier**: `controlcenter-screen-mirroring`
- **AXShowMenu opens the context menu** (right-click), not the device picker
- **AXPress / click opens the Screen Mirroring panel**
- After opening, the device list is present as a group:
  - **Device list group AXIdentifier**: `screen-mirroring-device-list`
  - **Device entries are checkboxes** with AXIdentifier like:
    - `screen-mirroring-device-AirPlay:<UUID>`
- **Problem**: Device *names are not exposed* via `name`, `title`, `description`, `value`, `AXLabel`, or `AXHelp` on the device entries or their children
- This means we can **see stable IDs** but cannot map them to human-readable display names

### Control Center Stability/Timing
- The Control Center window **closes easily** while enumerating UI elements
- Accessing `window 1` often fails mid-script with `Invalid index (-1719)` due to UI closing
- Using short delays and re-acquiring `window 1` helps, but still unreliable for deep traversal

### System Settings Displays UI
- UI elements in Displays are **mostly non-exposable** via standard accessibility properties
- Buttons/checkboxes/text fields do not surface meaningful `name`/`title`/`value`
- This matches the earlier finding that the "Mirror or extend to" area is not accessible

## Conclusion (Initial Investigation)
Control Center automation is viable for opening the Screen Mirroring panel and detecting device entries, **but macOS Tahoe does not expose device names**, only opaque AirPlay UUIDs. Without a reliable name → UUID mapping, fully automated selection by display name is not currently possible via AppleScript alone.

---

## SOLUTION FOUND: Sidecar Approach (January 2026)

### Working Implementation
After discovering the [Sidecar extension](https://github.com/raycast/extensions/tree/main/extensions/sidecar) from the Raycast extensions repository, we successfully adopted their proven approach:

**Key Insight**: Instead of trying to access the "Mirror or extend to" panel directly in the UI, we click the **dropdown menu button** and iterate through **menu items**.

### Menu-Clicking Approach (What Works)

```applescript
-- 1. Open System Settings > Displays
do shell script "open -b com.apple.systempreferences /System/Library/PreferencePanes/Displays.prefPane"

-- 2. Find the menu button (Tahoe) or pop-up button (pre-Tahoe)
set popUpButton to menu button 1 of group 1 of group 3 of splitter group 1...
-- or
set popUpButton to pop up button 1 of group 1 of group 2 of splitter group 1...

-- 3. Click to open the menu
click popUpButton

-- 4. Iterate through menu items
tell menu 1 of popUpButton
  repeat with i from 1 to count of menu items
    -- Find "Mirror or extend to" header
    -- Then find matching device name
    -- Click the matching menu item
  end repeat
end tell
```

### Why This Works
- **Menu items expose names** via standard accessibility APIs
- **Menu structure is stable** across macOS versions
- **Clicking menu items works** unlike clicking floating panels
- **Same approach used by getAvailableDisplays()** which already worked

### Enhancements Added
Beyond the Sidecar approach, we added:
1. **Display state detection** using `system_profiler SPDisplaysDataType`
2. **Toggle behavior** - connect if disconnected, disconnect if connected
3. **Audio preservation** - capture and restore original audio source
4. **Better feedback** - show actual connection state in toasts

### Files Modified
- `src/utils/connect.ts` - Rewrote with menu-clicking AppleScript
- `src/utils/displays.ts` - Already used this approach, kept it
- `src/index.tsx` - Enhanced feedback with connection state
- `src/quick-connect.tsx` - Added toggle behavior feedback
- `package.json` - Removed `run-applescript`, using native `child_process`

### Status: ✅ WORKING
The extension now successfully connects/disconnects displays on macOS Tahoe 26.2 while preserving audio output.

---

## Final Architecture (January 2026)

### Display Management
The extension uses a hybrid approach:

1. **Automatic Scanning** (`⌘R` or Enter on empty list)
   - Opens System Settings > Displays
   - Clicks the dropdown menu to open it
   - Reads all menu items after "Mirror or extend to" header
   - Saves discovered displays to local storage
   - Closes System Settings

2. **Manual Addition** (`⌘N`)
   - User can add display names manually
   - Helpful when scanning doesn't work or for quick setup
   - `⌘O` opens System Settings so user can see exact names

3. **Local Storage**
   - Displays are persisted using Raycast's LocalStorage API
   - Remembers last connected time for sorting
   - No need to rescan every time

### Theme-Aware Icons
- Uses `icon.png` and `icon@dark.png` naming convention
- Raycast automatically switches based on system theme
- Icons must be 512x512 pixels PNG format

### CLI Commands
The Raycast CLI is accessed via `npx ray`:
```bash
npx ray develop  # Dev mode
npx ray build -e dist  # Build
npx ray lint --fix  # Lint
```

### Deeplinks
After scan/connect, the extension reopens Raycast using deeplinks:
- Scan: `raycast://extensions/pavzagor/extend-display/connect-to-display`
- Connect: `raycast://` (generic, shows toast with result)

### Known Limitations
1. **Requires Accessibility permissions**
   - System Settings > Privacy & Security > Accessibility > Raycast

2. **UI hierarchy may change**
   - macOS updates can break the AppleScript paths
   - Currently tested on macOS Tahoe 26.2

3. **First deeplink requires confirmation**
   - User must select "Always Open Command" to skip future prompts
