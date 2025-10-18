# WLED Controller - Quick Start Guide

Get up and running in 5 minutes!

## Prerequisites

- macOS with [Raycast](https://www.raycast.com/) installed
- Node.js 18+ (`node --version`)
- At least one WLED device on your network
- Know the IP address of your WLED device(s)

## Installation Steps

### 1. Install Dependencies (1 minute)

```bash
npm install
```

### 2. Configure Your Devices (2 minutes)

#### Find Your WLED IP Address

**Quick Test**: Open browser and try these:
- `http://192.168.1.100` (common default)
- `http://wled.local`
- Check your router's device list for "WLED"

#### Add to Raycast

1. Start development mode:
   ```bash
   npm run dev
   ```

2. Raycast will open automatically

3. Press `Cmd+,` to open Raycast preferences

4. Go to: **Extensions** → **WLED Controller** → **Extension Preferences**

5. In the "WLED Devices (JSON)" field, paste:

   ```json
   [{"name":"My WLED","ip":"192.168.1.100"}]
   ```

   Replace `192.168.1.100` with your actual WLED IP address.

### 3. Test It Out (2 minutes)

Open Raycast and try these commands:

1. **"Control WLED"**
   - See your device listed
   - Toggle power on/off
   - Adjust brightness

2. **"Set WLED Color"**
   - Choose a color preset (try "Red" or "Blue")
   - Select your device to apply

3. **"Set WLED Effect"**
   - Browse effects
   - Try "Rainbow" or "Fire"

4. **"WLED Quick Actions"**
   - Quick power controls
   - Brightness presets

## Success!

If you can see your device and control it, you're all set!

## Common Issues

### "No WLED Devices Configured"
- Check your JSON format in preferences
- Make sure you saved the preferences

### "Failed to get WLED state"
- Verify IP address: `ping 192.168.1.100`
- Test in browser: `http://192.168.1.100/json`
- Ensure same network/WiFi

### Extension Won't Load
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
npm run dev
```

## Adding Multiple Devices

Update your config with multiple devices:

```json
[
  {"name":"Bedroom","ip":"192.168.1.100"},
  {"name":"Living Room","ip":"192.168.1.101"},
  {"name":"Office","ip":"192.168.1.102"}
]
```

## Next Steps

- Read [README.md](README.md) for full feature list
- Check [SETUP.md](SETUP.md) for detailed configuration
- See [example-config.json](example-config.json) for multi-device setup

## Getting Help

**Test Your WLED API:**
```bash
# Should return JSON data
curl http://192.168.1.100/json

# Turn on
curl -X POST http://192.168.1.100/json/state \
  -H "Content-Type: application/json" \
  -d '{"on":true}'
```

**Check Raycast Logs:**
1. Open Raycast
2. Press `Cmd+Shift+,`
3. Go to: Advanced → Open Extension Logs

**WLED Documentation:**
- https://kno.wled.ge/
- https://kno.wled.ge/interfaces/json-api/

---

Enjoy controlling your WLED devices! 💡✨
