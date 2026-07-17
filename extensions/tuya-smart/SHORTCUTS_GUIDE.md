# Apple Shortcuts Integration for Tuya Smart

This guide explains how to control your Tuya Smart devices using Apple Shortcuts with deeplink integration.

## How It Works

The extension now supports deeplink control with fuzzy search powered by Fuse.js. When you trigger a shortcut:

1. The shortcut calls the Raycast deeplink with device name and action
2. The extension searches cached devices using fuzzy matching (no internet required)
3. The best matching device is controlled automatically
4. You get instant feedback via HUD notification

## Deeplink Format

```
raycast://extensions/andresmorelos/tuya-smart/control-device?arguments=%7B%22query%22%3A%22DEVICE_NAME%22%2C%22action%22%3A%22ACTION%22%7D
```

Where:

- `DEVICE_NAME` = the name of your device (fuzzy search, so approximate names work)
- `ACTION` = "on" or "off" (also supports: open, close, enable, start, stop) - **OPTIONAL, defaults to toggle**

## Setting Up Apple Shortcuts

### Method 1: Manual Setup (Step-by-Step)

1. **Open Shortcuts app** on your Mac or iPhone

2. **Create a new shortcut** by clicking the `+` button

3. **Add "Open URLs" action**

   - Search for "Open URLs" in the actions list
   - Add it to your shortcut

4. **Enter the deeplink URL** in the following format:

   ```
   raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"tubelight","action":"on"}
   ```

   Replace:

   - `"tubelight"` with your device name
   - `"on"` with your desired action (on/off) - or omit action entirely to toggle

5. **Name your shortcut** (e.g., "Turn On Tubelight")

6. **Add to Home Screen** (iOS) or **Quick Actions** (macOS)

### Method 2: URL-Encoded Format (More Reliable)

For better compatibility, use URL-encoded format:

```
raycast://extensions/andresmorelos/tuya-smart/control-device?arguments=%7B%22query%22%3A%22tubelight%22%2C%22action%22%3A%22on%22%7D
```

This is the encoded version of: `{"query":"tubelight","action":"on"}`

### Method 3: Using Shortcut Variables (Advanced)

Create a more dynamic shortcut:

1. Add "Ask for Input" action

   - Prompt: "What device do you want to control?"
   - Input Type: Text

2. Add "Text" action with:

   ```
   raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"[Provided Input]","action":"on"}
   ```

3. Add "Open URLs" and select the Text variable

## Example Shortcuts

### Toggle Tubelight (Simple - No Action Needed)

```
raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"tubelight"}
```

### Turn On Tubelight

```
raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"tubelight","action":"on"}
```

### Turn Off Tubelight

```
raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"tubelight","action":"off"}
```

### Turn On Bedroom Light

```
raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"bedroom light","action":"on"}
```

### Open Curtain

```
raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"living room curtain","action":"open"}
```

### Close Curtain

```
raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"living room curtain","action":"close"}
```

## URL Encoding Helper

If you need to create URL-encoded deeplinks, you can use this pattern:

```
Original: {"query":"DEVICE_NAME","action":"ACTION"}
Encoded:  %7B%22query%22%3A%22DEVICE_NAME%22%2C%22action%22%3A%22ACTION%22%7D

For toggle (no action):
Original: {"query":"DEVICE_NAME"}
Encoded:  %7B%22query%22%3A%22DEVICE_NAME%22%7D
```

Or use an online URL encoder to convert your JSON arguments.

## Supported Actions

- **No action (toggle)** - Toggles the current state (on→off, off→on)
- **on** / **enable** / **start** / **open** - Turns device on or opens (for curtains)
- **off** / **close** - Turns device off or closes (for curtains)
- **stop** - Stops curtain movement (curtains only)

## Supported Device Types

- Switches (Switch, kg)
- Sockets
- Lights (dj, Light Source)
- Curtains (cl, Curtain)

## Fuzzy Search Examples

The fuzzy search is smart enough to find devices even with approximate names:

- "tube" → matches "Tubelight"
- "bed light" → matches "Bedroom Light"
- "living curtain" → matches "Living Room Curtain"
- "kitchen" → matches "Kitchen Socket"

## Important Notes

1. **Cache Requirement**: The extension uses cached device data, so you must open the Tuya Smart extension at least once before using shortcuts. The cache refreshes each time you open the main extension.

2. **No Internet Required**: Once devices are cached, shortcuts work offline (unless the device itself needs internet).

3. **Device Must Be Online**: The physical device must be online to receive commands.

4. **Best Match Selection**: If multiple devices match your query, the extension automatically selects the best match based on fuzzy search score.

## Troubleshooting

### "No cached devices found"

- Open the Tuya Smart extension in Raycast first to populate the cache
- The main extension view must load successfully

### "No device found matching..."

- Check your device name in the main Tuya Smart extension
- Try using a shorter or more specific query
- Fuzzy search is flexible but needs at least some similarity

### "Cannot perform action on device"

- The device type might not support the requested action
- Check if the device is online in the main extension

### Command doesn't work

- Ensure the device is online
- Verify your Tuya credentials are correct
- Check that the device appears in the main extension

## Siri Integration

You can also trigger these shortcuts with Siri:

1. Create the shortcut as described above
2. Name it clearly (e.g., "Turn On Tubelight")
3. Say to Siri: "Hey Siri, Turn On Tubelight"

## Automation Ideas

Combine with iOS/macOS automations:

- Turn on lights when you arrive home
- Turn off all devices at bedtime
- Control devices based on time of day
- Integrate with HomeKit automations

## Example: Complete Shortcut for "Goodnight"

Create a shortcut that turns off multiple devices:

1. Add multiple "Open URLs" actions:

   ```
   raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"bedroom light","action":"off"}
   ```

   ```
   raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"living room light","action":"off"}
   ```

   ```
   raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"curtain","action":"close"}
   ```

2. Add "Wait" actions between each URL (0.5-1 second)

3. Name it "Goodnight"

4. Say "Hey Siri, Goodnight" to trigger all actions

## Support

If you encounter issues, please check:

- Your Tuya API credentials are valid
- Devices appear in the main Tuya Smart extension
- The device names match (or are similar to) what you see in the extension
