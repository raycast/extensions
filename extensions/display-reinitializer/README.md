# Display Reinitializer for Raycast

A Raycast extension to force re-detection and reinitialization of connected displays on macOS using multiple methods.

## Features

- 📺 List all connected displays (built-in and external)
- 🔄 Multiple reinitialization methods to choose from
- 🎯 Smart auto-selection of best method per display
- 📊 Shows display resolution, type, refresh rate capability, and recommended method
- ⚡ Fast native Swift implementation using CoreGraphics APIs
- ⌨️ Assign global hotkeys to reinitialize specific displays via Quicklinks

## Reinitialization Methods

The extension offers **5 different methods** to reinitialize displays, each with different characteristics:

### 1. **Auto-Select** (Default) ⭐
- Automatically chooses the best method for each display
- Tries methods in order of effectiveness
- Recommended for most users

**Selection logic:**
- External displays → DDC Power Cycle
- Multiple refresh rates available → Refresh Rate Toggle
- Otherwise → Resolution Cycle
- Last resort → Soft Reset

### 2. **DDC Power Cycle** (Most Effective)
- Hardware-level power off/on via DDC/CI protocol
- **External displays only** (doesn't work on built-in screens)
- Requires `m1ddc` tool: `brew install m1ddc`
- **Disruption:** Low (1-2 second black screen on target display)

### 3. **Refresh Rate Toggle** (Less Disruptive)
- Temporarily changes refresh rate then restores original
- Only available if display supports multiple refresh rates
- **Disruption:** Low (brief flicker)

### 4. **Resolution Cycle** (Most Compatible)
- Temporarily changes resolution then restores original
- Works on all displays (built-in and external)
- **Disruption:** Medium (visible screen flash, may briefly rearrange windows)

### 5. **Soft Reset** (Minimal)
- Triggers display reconfiguration without mode changes
- Least disruptive but may not fix all issues
- **Disruption:** Very Low (may have no visible effect)

## Usage

### Basic Usage (Auto-Select)

1. Open Raycast (default: `Cmd + Space`)
2. Type "Reinitialize Displays"
3. Select a display from the list
4. Press `Enter` to reinitialize using the recommended method

The extension will automatically choose the best method for that specific display.

### Advanced Usage (Choose Method)

1. Select a display from the list
2. Press `Cmd + K` to open the action menu
3. Under "Choose Reinitialization Method", select your preferred method
4. Available methods are shown based on display compatibility

### View Display Details

- Press `Cmd + K` → "View Display Details" to see:
  - All available reinitialization methods
  - Method descriptions and disruption levels
  - Display capabilities (resolution, refresh rates, etc.)

### Quick Reinitialize with Hotkeys

You can assign global hotkeys to instantly reinitialize specific displays using the **Quick Reinitialize Display** command with Raycast Quicklinks:

1. Open Raycast and search for **"Quick Reinitialize Display"**
2. Enter your display name (e.g., `LG` or `Dell U2723QE`)
   - Matching is flexible: partial names, case-insensitive, or display ID
3. Press `Cmd + K` and select **"Copy Deeplink"**
4. Open Raycast and run the **"Create Quicklink"** command
5. Paste the deeplink and give it a name (e.g., "Reinit LG Monitor")
6. Go to **Raycast Settings > Extensions > Quicklinks**
7. Find your quicklink and assign a hotkey (e.g., `Cmd + Shift + 1`)

Now pressing that hotkey will instantly reinitialize that specific display without opening any UI.

**Display Matching:**
- `"LG"` matches `"LG 27UK850-W"` (partial match)
- `"dell"` matches `"Dell U2723QE"` (case-insensitive)
- `"2"` matches display with ID 2

## Display Information

For each display, the extension shows:

- **Name**: Human-readable display name (or "Main Display", "Built-in Display", etc.)
- **Resolution**: Current width x height
- **Type**: Built-in or External
- **Main**: Blue badge if this is the main display
- **Recommended Method**: Suggested reinitialization approach
- **Display ID**: System identifier

## How It Works

The extension uses macOS CoreGraphics APIs to reinitialize displays:

1. **DDC Method**: Uses `m1ddc` to send hardware power commands
2. **Refresh Rate Method**: `CGConfigureDisplayWithDisplayMode()` to cycle refresh rates
3. **Resolution Method**: `CGConfigureDisplayWithDisplayMode()` to cycle resolutions
4. **Soft Reset**: `CGCompleteDisplayConfiguration()` to trigger reconfiguration

These methods can fix issues like:
- Display not waking from sleep
- Incorrect color profile
- Resolution problems
- Connection detection issues
- HDMI/DisplayPort signal dropout

## Requirements

### Required
- macOS (this extension only works on macOS)
- Raycast app installed
- Xcode (for Swift compilation during build)

### Optional
- **m1ddc** (for DDC power cycle on external displays)
  ```bash
  brew install m1ddc
  ```
  Without m1ddc, the extension will fall back to other methods automatically.

## Development

### Prerequisites

- macOS
- Node.js 20+
- Xcode
- Raycast app

### Setup

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run in development mode:
   ```bash
   npm run dev
   ```

   Swift code is automatically compiled by Raycast's build system.

### Build

```bash
npm run build
```

The build process automatically compiles the Swift package using Raycast's Swift Tools integration.

## Technical Details

The extension consists of two integrated parts:

### 1. Swift Package (`swift/display-helper/`)
A Swift package using [Raycast's Swift Tools](https://github.com/raycast/extensions-swift-tools) that provides:

**Exported Functions:**
- `getAllDisplays()` - Returns array of all displays with metadata
- `reinitializeDisplay(displayId, method)` - Reinitializes a specific display
  - Methods: `auto`, `ddc`, `refresh`, `resolution`, `soft`

**Display Metadata:**
- Available reinitialization methods
- Recommended method
- Whether display has multiple refresh rates
- Standard display info (ID, name, resolution, etc.)

**Implementation:**
- Uses macOS CoreGraphics and IOKit frameworks
- Compiled automatically during build via Raycast's Swift plugin system
- Functions are marked with `@raycast` macro for TypeScript integration

### 2. Raycast Extension
**`src/reinitialize-displays.tsx`** - Main UI command
- TypeScript/React UI
- Direct Swift function imports using `swift:` module specifier
- Type-safe integration with auto-generated TypeScript definitions
- Handles user interaction and feedback
- Provides method selection interface

**`src/quick-reinitialize.ts`** - Background command for hotkeys
- No-view command that accepts display name argument
- Flexible display matching (partial, case-insensitive, by ID)
- Designed for use with Raycast Quicklinks and hotkeys

## Troubleshooting

### "m1ddc not found" Error
- Install m1ddc: `brew install m1ddc`
- Or use other methods (refresh rate, resolution cycle)

### "No alternate refresh rate available"
- Your display only supports one refresh rate
- Try resolution cycle or DDC method instead

### "Failed to apply temporary mode"
- macOS denied the display mode change
- Try a different method or restart your Mac

### Display Doesn't Actually Reinitialize
- Some methods are less effective than others
- Try DDC power cycle if you have an external display
- Resolution cycle is the most reliable fallback

### Built-in Display Methods Limited
- Built-in displays don't support DDC
- Only refresh rate toggle, resolution cycle, and soft reset available
- This is a hardware limitation

### Quick Reinitialize "Display not found"
- The display name didn't match any connected display
- Try a more specific name, or check available displays with the main command
- You can also use the display ID number instead of name

## Keyboard Shortcuts

### Reinitialize Displays (Main Command)
- `Enter` - Reinitialize with auto-selected method
- `Cmd + K` - Open action menu
- `1-4` - Quick select specific method (when action menu is open)
- `Cmd + R` - Refresh display list

### Quick Reinitialize Display
- Assign custom hotkeys via Raycast Quicklinks (see [Quick Reinitialize with Hotkeys](#quick-reinitialize-with-hotkeys))

## License

MIT

## Credits

Built using:
- [Raycast API](https://developers.raycast.com/)
- [Raycast Swift Tools](https://github.com/raycast/extensions-swift-tools)
- macOS CoreGraphics framework
- IOKit framework
- [m1ddc](https://github.com/waydabber/m1ddc) (optional dependency)

## Development Note

While I (the human) did the driving and direction, this code was generated with AI assistance to solve a display reinitialization problem I couldn't allocate time to fix manually. The AI helped implement the Swift display management logic, multiple reinitialization methods, and the Raycast UI integration.
