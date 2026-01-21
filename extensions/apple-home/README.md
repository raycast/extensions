# Apple Home

Control your HomeKit accessories directly from Raycast using macOS Shortcuts.

## Setup

This extension uses the macOS Shortcuts app to control HomeKit accessories. You'll need to create shortcuts for each accessory you want to control.

### Step 1: Create a Folder in Shortcuts

1. Open the **Shortcuts** app on your Mac
2. Create a new folder called **HomeKit**

### Step 2: Create Shortcuts for Your Accessories

Create shortcuts in your HomeKit folder using these naming conventions:

#### Toggle Shortcuts (Recommended)

For accessories you want to toggle on/off, create two shortcuts:

1. **Control shortcut**: Name it after your accessory (e.g., `Living Room Light`)
   - Add "Control Home" action → Select your accessory → Set to "Toggle"

2. **State shortcut**: Name it `Get [Accessory Name] State` (e.g., `Get Living Room Light State`)
   - Add "Get State of Home Accessory" action → Select your accessory
   - The shortcut should output the state (on/off)

#### Scene Shortcuts

For shortcuts that control multiple accessories (scenes), simply name them without the above prefixes:

- `Movie Night` - Dims lights, turns on TV, etc.
- `Good Morning` - Opens blinds, turns on coffee maker, etc.

### Example Setup

| Shortcut Name | Type | Description |
|---------------|------|-------------|
| `Bedroom Light` | Toggle | Controls bedroom light |
| `Get Bedroom Light State` | State | Returns on/off state |
| `Movie Night` | Scene | Activates movie scene |

## Features

- **Quick Toggle**: Press Enter to toggle accessories on/off
- **Live Status**: See which lights are on/off (requires state shortcuts)
- **Optimistic Updates**: UI updates instantly when toggling
- **Scenes Support**: Run multi-accessory scenes
- **Search**: Find accessories quickly with fuzzy search

## Troubleshooting

### Shortcuts not appearing

- Make sure your shortcuts are in the **HomeKit** folder in the Shortcuts app

### State not showing

- Create a "Get [Accessory Name] State" shortcut for each accessory
- Make sure the shortcut outputs the state (add a "Stop and Output" action if needed)

### Shortcut not running

- Test the shortcut directly in the Shortcuts app first
- Check that you've granted the necessary HomeKit permissions to Shortcuts
