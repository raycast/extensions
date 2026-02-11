# Setup Guide for Luxafor Controller

## Prerequisites

1. **Luxafor Device**: Any Luxafor 2.0 compatible device
   - Luxafor Flag
   - Luxafor Colorblind Flag
   - Luxafor Orb
   - Luxafor Bluetooth Pro
   - Luxafor Bluetooth

2. **Luxafor Software**: Install the latest version from [luxafor.co.uk](https://luxafor.co.uk/download/)

## Step 1: Get Your User ID

1. Open Luxafor software
2. Go to the **Webhook** tab
3. Copy your **User ID** (it's a long string of characters)

## Step 2: Configure the Extension

1. Open Raycast
2. Go to **Extensions** → **Luxafor Controller**
3. Click the gear icon (⚙️) to open preferences
4. Enter your **Luxafor User ID**
5. Choose your preferred **API Endpoint**:
   - `api.luxafor.com` (US)
   - `api.luxafor.co.uk` (UK)

## Step 3: Test the Connection

1. In the extension, click **Test Connection**
2. Confirm the test (it will briefly turn your device red)
3. If successful, you'll see a green checkmark

## Step 4: Enable Menubar Status (Optional)

1. The extension automatically creates a **Luxafor Status** command
2. This appears in your menubar as a colored circle icon
3. The icon color matches your device's current color
4. Click it for quick actions and status information

### Menubar Features:
- **Real-time color indicator**: Shows current device color
- **Online/offline status**: Connection status at a glance
- **Quick actions**: Turn off, set red/green/blue directly
- **Auto-refresh**: Updates every 30 seconds
- **Last action**: Shows what was last performed

## Step 5: Start Controlling!

- **Turn Off**: Turn all LEDs off
- **Basic Colors**: Set solid colors (red, green, blue, yellow, cyan, magenta, white)
- **Blink Effects**: Make any color blink
- **Connection Testing**: Verify device connectivity and health
- **Menubar**: Quick access to common actions

## Troubleshooting

### Device Not Responding?
- Check your User ID is correct
- Ensure Luxafor software is running
- Verify your device is connected and powered on
- Try the **Test Connection** feature

### API Errors?
- Check your internet connection
- Verify the API endpoint is correct
- Ensure your User ID is valid

### Menubar Not Showing?
- Make sure the "Luxafor Status" command is enabled
- Check Raycast preferences for the extension
- Restart Raycast if needed

### Still Having Issues?
- Check the Luxafor software logs
- Verify your device supports webhook API
- Try restarting Luxafor software

## Testing the API Directly

You can test the API calls directly using the included test script:

```bash
# Edit test-api.js and set your User ID
npm run test:api
```

This will test basic functionality without going through Raycast.

## Pro Tips

- **Use the menubar** for quick color changes during work
- **Test connection first** before using the extension
- **Keep Luxafor software running** for webhook mode
- **The menubar icon color** always matches your device's current state
