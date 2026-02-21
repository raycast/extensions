# Color Filters for Raycast

Control macOS Color Filters directly from Raycast. Toggle filters on/off and switch between different filter types without opening System Settings.

## Features

- **Toggle Color Filters** - Quickly turn color filters on or off
- **Switch Filter Types** - Change between all 5 macOS color filter types:
  - Grayscale
  - Protanopia (Red/Green) - for red-green color blindness
  - Deuteranopia (Green/Red) - for red-green color blindness  
  - Tritanopia (Blue/Yellow) - for blue-yellow color blindness
  - Color Tint
- **Visual Filter Selector** - Browse all filters with descriptions and see which is currently active

## Commands

| Command | Description |
|---------|-------------|
| Toggle Color Filters | Turn filters on/off |
| Select Color Filter | Open list to choose a filter |
| Set Grayscale Filter | Enable grayscale mode |
| Set Protanopia Filter | Enable red/green filter |
| Set Deuteranopia Filter | Enable green/red filter |
| Set Tritanopia Filter | Enable blue/yellow filter |
| Set Color Tint Filter | Enable color tint |
| Disable Color Filters | Turn off all filters |

## How It Works

This extension uses AppleScript to control color filters via System Settings UI automation. The extension:

- Navigates to the correct System Settings pane automatically
- Keeps System Settings running in the background for fast subsequent calls
- Hides the window after making changes for a clean experience

## Requirements

- macOS 10.15 (Catalina) or later
- Accessibility permissions for Raycast (you'll be prompted on first use)

## Important Notes

⚠️ **macOS Version Compatibility**: This extension was built with Claude Code and is optimized for macOS Tahoe (26.x). The UI element paths are specific to the current System Settings layout. If Apple changes the System Settings UI structure in future macOS versions, the extension may need updates.

### For Future AI Agents

If this extension stops working after a macOS update, the UI element paths likely changed. To fix:

1. **Capture the new UI hierarchy:**
   ```bash
   # Open System Settings to Accessibility > Display > Color Filters
   open 'x-apple.systempreferences:com.apple.preference.universalaccess?Seeing_Display'

   # Run this AppleScript to dump the UI structure:
   osascript -e 'tell application "System Events" to tell process "System Settings" to get entire contents of window 1'
   ```

2. **Find the Color Filters checkbox** in the output and update `CHECKBOX_PATH` in `src/color-filters.ts`

3. **Find the filter type popup button** and update `POPUP_PATH` in `src/color-filters.ts`

4. **Update the paths in:** `src/color-filters.ts` (lines 35-36)

Current paths (macOS 26.x):
```
CHECKBOX_PATH = "checkbox 1 of group 5 of scroll area 1 of group 1 of group 3 of splitter group 1 of group 1 of window 1"
POPUP_PATH = "pop up button 1 of group 5 of scroll area 1 of group 1 of group 3 of splitter group 1 of group 1 of window 1"
```

## Use Cases

- **Reduce eye strain** - Enable grayscale in the evening
- **Focus mode** - Grayscale can help reduce distractions
- **Accessibility** - Quickly switch filters for color vision deficiencies
- **Screen time management** - Make your screen less appealing

## Tips

- Assign keyboard shortcuts to your most-used commands in Raycast preferences
- Use "Toggle Color Filters" for quick on/off switching
- Use "Select Color Filter" when you want to see current status and change filter types

## Troubleshooting

If commands don't work:

1. **Grant Accessibility Permissions**: Go to System Settings → Privacy & Security → Accessibility → Enable Raycast
2. **Check macOS Version**: This extension works on macOS 10.15+
3. **Reload Extension**: Press ⌘⇧R in Raycast to reload extensions

## Privacy

This extension:
- Does not collect any data
- Does not require network access
- Only uses local macOS system APIs

## Performance

- **First call**: ~200ms (System Settings opens in background)
- **Subsequent calls**: ~200ms (System Settings already running)
- Much faster than manually navigating through System Settings!

## Credits

Built with Claude Code using AppleScript UI automation, optimized for performance.
