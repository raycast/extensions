# Siri Voice Control Setup for Tuya Smart

This guide shows you how to set up **one universal shortcut** that lets you control any device with Siri using natural voice commands.

## Overview

Instead of creating individual shortcuts for each device, you'll create **one dynamic shortcut** that:

- Listens to what you say after the trigger phrase
- Extracts the device name and action from your voice
- Automatically constructs and executes the deeplink
- Works with fuzzy matching, so you don't need exact names

## Examples of What You Can Say

Once set up, you can say:

- "Hey Siri, **Control Device** turn on main light"
- "Hey Siri, **Control Device** turn off bedroom lamp"
- "Hey Siri, **Control Device** enable kitchen socket"
- "Hey Siri, **Control Device** toggle living room"
- "Hey Siri, **Control Device** main light" (toggles automatically)

**Note**: "Control Device" is the shortcut name - you can change it to whatever you prefer!

## Setup Instructions (iOS)

### Step 1: Create the Universal Shortcut

1. Open the **Shortcuts** app on your iPhone
2. Tap the **+** button to create a new shortcut
3. Tap **Add Action**

### Step 2: Ask for Voice Input

1. Search for **"Ask for Input"**
2. Add it to your shortcut
3. Configure it:
   - **Prompt**: "What device would you like to control?"
   - **Input Type**: Text
   - **Default Answer**: (leave empty)

### Step 3: Process the Voice Input

1. Search for **"Text"** action and add it
2. In the text field, type the following deeplink format:
   ```
   raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"Provided Input"}
   ```
3. **Important**: Tap on "Provided Input" to insert the actual variable from the previous step

### Step 4: Open the Deeplink

1. Search for **"Open URLs"** action and add it
2. Tap on the URL field
3. Select the **Text** output from the previous step (it should show as a blue variable)

### Step 5: Name Your Shortcut

1. Tap on the shortcut name at the top
2. Rename it to something easy to say, like:
   - "Control Device"
   - "Smart Home"
   - "Home Control"
   - "Device Control"

### Step 6: Test It

1. Tap the ▶ Play button to test
2. When prompted, say or type: "turn on kitchen light"
3. You should see the HUD notification confirming the action

## Setup Instructions (macOS)

The setup is identical on macOS:

1. Open **Shortcuts** app
2. Follow the same steps as iOS above
3. You can trigger it by:
   - Saying "Hey Siri, Control Device turn on main light"
   - Using Spotlight: Press Cmd+Space, type the shortcut name
   - Clicking the shortcut from the Shortcuts app

## Advanced: Smart Parsing Version

For more intelligent parsing (extracting action and device automatically), create this advanced shortcut:

### Step 1-2: Same as above (Ask for Input)

### Step 3: Split the Input

1. Add **"Text"** action
2. Type: `Provided Input` (insert the variable)

### Step 4: Match Action (Optional - for explicit parsing)

1. Add **"Match Text"** action
2. Pattern: `(turn on|turn off|enable|disable|toggle|open|close|on|off)`
3. This extracts the action keyword

### Step 5: Create Dynamic URL

1. Add **"Text"** action
2. Type the following:

   ```
   raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"Provided Input"}
   ```

   **Or** if you want to extract device name separately:

   ```
   raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"Device Name","action":"Action"}
   ```

### Step 6: Open URL (Same as basic version)

## Simple Alternative: Just Device Names

If you prefer simpler commands where you only say the device name (auto-toggles):

1. Follow steps 1-2 from basic setup
2. Change prompt to: "Which device?"
3. Use this deeplink (no action specified):
   ```
   raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"Provided Input"}
   ```

Then you can say:

- "Hey Siri, Control Device main light" → toggles
- "Hey Siri, Control Device bedroom" → toggles

## Tips for Best Results

### 1. **Natural Language Works**

The system uses fuzzy matching, so these all work:

- "turn on the kitchen light"
- "enable kitchen"
- "kitchen on"
- "start kitchen light"

### 2. **Device Name Flexibility**

If your device is named "Living Room Main Light":

- "living room" works
- "main light" works
- "living main" works
- "living room main" works

### 3. **Action Variations**

All these mean the same thing:

- **On**: on, turn on, enable, start, activate, open
- **Off**: off, turn off, disable, stop, close, shut
- **Toggle**: toggle, switch, flip (or just omit the action)

### 4. **Shorter is Better**

Siri recognition works best with clear, short commands:

- ✅ "turn on kitchen"
- ✅ "kitchen on"
- ⚠️ "could you please turn on the kitchen light for me"

## Customization Ideas

### Multiple Trigger Phrases

Create different shortcuts for different rooms:

**"Living Room"** shortcut:

- Prompt: "What action?"
- Deeplink: `{"query":"living room Provided Input"}`

**"Bedroom"** shortcut:

- Prompt: "What action?"
- Deeplink: `{"query":"bedroom Provided Input"}`

Then say:

- "Hey Siri, Living Room turn on"
- "Hey Siri, Bedroom turn off"

### Quick Toggle Shortcuts

For frequently used devices, create one-tap shortcuts:

**"Main Light"** shortcut (no "Ask for Input"):

- Direct deeplink: `{"query":"main light"}`
- Add to Home Screen
- Say: "Hey Siri, Main Light"

### Scene Shortcuts

Create combo shortcuts for multiple devices:

**"Good Morning"** shortcut:

1. Open URL: `{"query":"bedroom light","action":"on"}`
2. Wait: 0.5 seconds
3. Open URL: `{"query":"curtain","action":"open"}`
4. Wait: 0.5 seconds
5. Show notification: "Good morning! ☀️"

**"Good Night"** shortcut:

1. Open URL: `{"query":"living room","action":"off"}`
2. Wait: 0.5 seconds
3. Open URL: `{"query":"bedroom light","action":"off"}`
4. Wait: 0.5 seconds
5. Open URL: `{"query":"curtain","action":"close"}`
6. Show notification: "Good night! 🌙"

## Troubleshooting

### "No switch found matching..."

- Check the device name in the main Tuya Smart extension
- Try using just part of the name
- Ensure you've opened the extension at least once to cache devices

### Siri doesn't understand my command

- Speak clearly and at moderate pace
- Use simpler phrases: "turn on kitchen" instead of "turn on the kitchen light"
- Try different phrasing: "enable kitchen" or "kitchen on"

### Shortcut doesn't run

- Make sure Raycast is running
- Check that the deeplink format is correct
- Test the shortcut manually first (tap the ▶ button)

### Wrong device gets controlled

- Be more specific with the device name
- Use both room name and device type: "bedroom main light"
- Check for duplicate names in the Tuya app

## URL Encoding (For Advanced Users)

If you have issues with special characters, you can URL-encode the deeplink:

**Original:**

```
raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"Provided Input"}
```

**Encoded:**

```
raycast://extensions/andresmorelos/tuya-smart/control-device?arguments=%7B%22query%22%3A%22Provided%20Input%22%7D
```

Use the **"URL Encode"** action in Shortcuts before opening the URL.

## Example: Complete Universal Shortcut Summary

**Shortcut Name**: "Control Device"

**Actions**:

1. Ask for Input → "What device would you like to control?" → Type: Text
2. Text → `raycast://extensions/andresmorelos/tuya-smart/control-device?arguments={"query":"Provided Input"}`
3. Open URLs → [Select Text variable]

**Usage**:

- "Hey Siri, Control Device turn on main light"
- "Hey Siri, Control Device bedroom off"
- "Hey Siri, Control Device toggle kitchen"

## Alternative: Menu-Based Shortcut

For visual selection instead of voice:

1. Add **"Choose from Menu"** action
2. Add menu items:
   - "Turn On" → Open URL with `{"query":"DEVICE","action":"on"}`
   - "Turn Off" → Open URL with `{"query":"DEVICE","action":"off"}`
   - "Toggle" → Open URL with `{"query":"DEVICE"}`
3. Before the menu, add "Ask for Input" → "Which device?"
4. Use the device input in all menu options

This gives you a visual interface when you can't use voice!

## Integration with Home Automation

You can trigger these shortcuts from:

- **Automations**: Based on time, location, or other triggers
- **Home app**: If you have a HomeKit bridge
- **NFC tags**: Tap your phone to a tag to trigger
- **Back Tap**: iOS accessibility feature (tap back of phone)
- **CarPlay**: Voice commands while driving

## Support

For issues related to:

- **Siri not recognizing**: Check iPhone Settings → Siri & Search
- **Shortcuts not working**: Check Settings → Shortcuts → Allow Running Scripts
- **Raycast integration**: Ensure Raycast extension is installed and configured
- **Device control**: Verify devices work in the main Tuya Smart extension
