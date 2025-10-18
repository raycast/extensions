# Next Steps - Getting Your WLED Controller Running

Follow these steps to get your WLED Controller extension up and running!

## Step 1: Add an Icon (Required)

The extension needs an icon file to load in Raycast.

### Quick Option - Use a Simple Placeholder

Create a simple icon using macOS native tools:

```bash
# Option A: If you have ImageMagick installed
convert -size 512x512 -gravity center -pointsize 200 \
  -background '#FF6B35' -fill white label:'W' \
  icon.png

# Option B: Download a free icon
# Visit https://www.flaticon.com/search?word=led+light
# Download a 512x512 PNG and save as icon.png
```

Or manually:
1. Open macOS Preview
2. Create a new image (512x512)
3. Add a simple lightbulb or LED icon
4. Save as `icon.png` in the root directory

See [assets/icon-instructions.md](assets/icon-instructions.md) for more options.

## Step 2: Find Your WLED Device IP(s)

You need the IP address of your WLED device(s). Try these methods:

### Method 1: Check WLED Display
If your WLED has a display, it shows the IP on boot.

### Method 2: Try Common Addresses
Open browser and try:
- http://wled.local
- http://192.168.1.100
- http://192.168.1.50

### Method 3: Check Your Router
1. Log into your router admin panel
2. Look for connected devices
3. Find device named "WLED" or similar

### Method 4: Network Scan
```bash
# Scan your network (macOS)
arp -a | grep -i wled

# Or install and use nmap
brew install nmap
nmap -p 80 192.168.1.0/24
```

### Verify It Works
```bash
# Replace with your IP
curl http://192.168.1.100/json

# Should return JSON with device info
```

## Step 3: Install Dependencies

```bash
npm install
```

This will install:
- Raycast API
- TypeScript
- React
- All development tools

## Step 4: Start Development Mode

```bash
npm run dev
```

This will:
- Compile the extension
- Open Raycast
- Enable hot-reload for changes
- Show any compilation errors

## Step 5: Configure Your Devices

1. Raycast should be open from the previous step
2. Press `Cmd+,` to open Raycast preferences
3. Navigate to: **Extensions** → **WLED Controller**
4. Find the **Extension Preferences** section
5. In "WLED Devices (JSON)", paste your config:

### Single Device
```json
[{"name":"My WLED","ip":"192.168.1.100"}]
```

### Multiple Devices
```json
[
  {"name":"Bedroom","ip":"192.168.1.100"},
  {"name":"Living Room","ip":"192.168.1.101"},
  {"name":"Office","ip":"192.168.1.102"}
]
```

Replace IPs with your actual device addresses!

## Step 6: Test the Extension

### Test 1: Control WLED
1. Open Raycast (`Cmd+Space` or your hotkey)
2. Type: "Control WLED"
3. You should see your device(s) listed
4. Try toggling power on/off
5. Try adjusting brightness

### Test 2: Set Color
1. Open Raycast
2. Type: "Set WLED Color"
3. Choose a color (try "Red")
4. Select your device
5. Lights should change color

### Test 3: Set Effect
1. Open Raycast
2. Type: "Set WLED Effect"
3. Search for "Rainbow"
4. Apply to your device
5. Watch the effect activate

### Test 4: Quick Actions
1. Open Raycast
2. Type: "WLED Quick Actions"
3. Try "Turn All On"
4. All your devices should turn on

## Step 7: Build for Production (Optional)

Once you're happy with the setup, build for permanent use:

```bash
npm run build
```

Now the extension will work without keeping the dev server running!

## Troubleshooting

### Issue: "No WLED Devices Configured"

**Fix:**
- Check your JSON syntax in preferences
- Ensure you clicked outside the text field to save
- Try restarting Raycast

### Issue: "Failed to get WLED state"

**Fix:**
1. Verify IP address:
   ```bash
   ping 192.168.1.100
   ```

2. Test API access:
   ```bash
   curl http://192.168.1.100/json
   ```

3. Check network:
   - Are you on the same WiFi network?
   - Is VPN disabled?
   - Can you access the WLED web interface?

### Issue: Extension Won't Load in Raycast

**Fix:**
```bash
# Clean and reinstall
rm -rf node_modules
npm install
npm run dev
```

### Issue: TypeScript Errors

**Fix:**
```bash
# Run the linter
npm run lint

# Auto-fix issues
npm run fix-lint
```

## Keyboard Shortcuts Reference

### Control WLED
- `Cmd+↑` - Increase brightness
- `Cmd+↓` - Decrease brightness
- `Cmd+R` - Refresh device states

### Set WLED Color
- `Cmd+A` - Apply to all devices

### Set WLED Effect
- `Cmd+A` - Apply to all devices
- `Cmd+R` - Refresh effects list

## Customization Ideas

### Add More Quick Colors
Edit [src/set-color.tsx](src/set-color.tsx) and add to `COLOR_PRESETS` array:

```typescript
{ name: "My Custom Color", hex: "#ABCDEF", color: Color.Blue }
```

### Add Custom Quick Actions
Edit [src/quick-actions.tsx](src/quick-actions.tsx) and add to `quickActions` array.

### Change Keyboard Shortcuts
Edit the command files and modify the `shortcut` prop in actions.

## What's Next?

- **Explore Features**: Try all four commands
- **Add More Devices**: Update your config with more WLED devices
- **Create Presets**: Save favorite settings as WLED presets
- **Share**: Tell others about the extension
- **Contribute**: Improve the code and submit PRs

## Getting Help

### Documentation
- [README.md](README.md) - Full documentation
- [SETUP.md](SETUP.md) - Detailed setup guide
- [QUICKSTART.md](QUICKSTART.md) - Quick start guide

### WLED Resources
- WLED Docs: https://kno.wled.ge/
- WLED JSON API: https://kno.wled.ge/interfaces/json-api/
- WLED Discord: https://discord.gg/wled

### Raycast Resources
- Raycast Docs: https://developers.raycast.com/
- Raycast Store: https://www.raycast.com/store

## Success Checklist

- [ ] Icon added (icon.png in root)
- [ ] WLED device IP(s) identified
- [ ] Dependencies installed (npm install)
- [ ] Extension running (npm run dev)
- [ ] Devices configured in preferences
- [ ] Successfully controlled at least one device
- [ ] Tested color changes
- [ ] Tested effects
- [ ] Tested quick actions

Once all checked, you're ready to enjoy your WLED Controller! 🎉

---

**Happy lighting!** 💡✨

If you run into issues not covered here, check the troubleshooting sections in [SETUP.md](SETUP.md) or review the [PROJECT-SUMMARY.md](PROJECT-SUMMARY.md) for technical details.
