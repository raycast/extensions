# WLED Controller - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Find Your WLED Device IPs

You need to know the IP addresses of your WLED devices. Here are several ways to find them:

#### Option A: WLED Device Display
If your WLED device has a display, the IP address is usually shown on startup.

#### Option B: Router/Network Scanner
1. Log into your router's admin interface
2. Look for a "DHCP Clients" or "Connected Devices" list
3. Find devices named "WLED-" or with the hostname you set

#### Option C: WLED App
1. Use the official WLED mobile app
2. It can discover WLED devices on your network
3. Note down the IP addresses

#### Option D: mDNS (if enabled)
Try accessing: `http://wled.local`

If you have multiple devices, they might be:
- `http://wled-bedroom.local`
- `http://wled-livingroom.local`

#### Option E: Network Scanner Tools
```bash
# macOS/Linux - using nmap
nmap -p 80 192.168.1.0/24

# Look for devices with port 80 open, then try accessing them in a browser
```

### 3. Configure Devices in Raycast

1. Open Raycast (`Cmd+Space` or your configured hotkey)
2. Type "Configure Extension" and select "WLED Controller"
3. In the "WLED Devices (JSON)" field, paste your device configuration:

```json
[
  {
    "name": "Bedroom Strip",
    "ip": "192.168.1.100"
  },
  {
    "name": "Living Room",
    "ip": "192.168.1.101"
  }
]
```

**Important:**
- Replace the IP addresses with your actual WLED device IPs
- Give each device a descriptive name
- Make sure the JSON is valid (use a JSON validator if needed)

### 4. Run in Development Mode

```bash
npm run dev
```

This will:
- Open Raycast
- Load the extension in development mode
- Enable hot-reload for code changes

### 5. Test the Extension

1. Open Raycast
2. Type "Control WLED" or "Set WLED Color"
3. You should see your configured devices
4. Try toggling power or changing colors

## Verifying WLED API Access

Before configuring the extension, verify you can access your WLED device:

### Test in Browser

1. Open your browser
2. Navigate to: `http://[your-wled-ip]/json`
3. You should see JSON data about your device

Example: `http://192.168.1.100/json`

Expected response:
```json
{
  "state": {
    "on": true,
    "bri": 128,
    ...
  },
  "info": {
    "ver": "0.14.0",
    "name": "WLED",
    ...
  },
  "effects": [...],
  "palettes": [...]
}
```

### Test with curl

```bash
# Get device state
curl http://192.168.1.100/json

# Turn on
curl -X POST http://192.168.1.100/json/state -H "Content-Type: application/json" -d '{"on":true}'

# Set color to red
curl -X POST http://192.168.1.100/json/state -H "Content-Type: application/json" -d '{"seg":[{"col":[[255,0,0]]}]}'
```

## Common Setup Issues

### Issue: "Failed to get WLED state"

**Possible Causes:**
1. Wrong IP address
2. Device is offline
3. Network connectivity issues
4. Firewall blocking access

**Solutions:**
- Ping the device: `ping 192.168.1.100`
- Access the web interface in a browser
- Check if your Mac and WLED are on the same network
- Disable VPN if active
- Check firewall settings

### Issue: "No WLED Devices Configured"

**Solution:**
Make sure you've added devices in the extension preferences with valid JSON format.

### Issue: JSON Parse Error

**Common Mistakes:**
```json
// ❌ Wrong - Missing quotes around IP
[{"name":"Bedroom","ip":192.168.1.100}]

// ❌ Wrong - Single quotes
[{'name':'Bedroom','ip':'192.168.1.100'}]

// ❌ Wrong - Trailing comma
[{"name":"Bedroom","ip":"192.168.1.100"},]

// ✅ Correct
[{"name":"Bedroom","ip":"192.168.1.100"}]
```

**Use a JSON Validator:**
Copy your JSON to https://jsonlint.com/ to validate it.

### Issue: Device Shows as "Off" When It's On

**Solution:**
- Refresh the device list (Cmd+R in the extension)
- Check if the device is responding to API calls
- Restart the WLED device

## Network Configuration Tips

### Static IP Addresses (Recommended)

To prevent IP addresses from changing, set static IPs for your WLED devices:

#### Method 1: Router DHCP Reservation
1. Log into your router
2. Find DHCP Settings
3. Add a reservation for your WLED device's MAC address
4. Assign a static IP

#### Method 2: WLED Configuration
1. Access WLED web interface
2. Go to Config > WiFi Setup
3. Set a static IP in the "IP Settings" section

### Firewall Configuration

If you have a firewall, allow:
- **Port 80 (HTTP)**: For API access
- **Port 21324 (UDP)**: For WLED discovery (optional)

## Advanced Configuration

### Multiple Networks

If you have WLED devices on different networks/VLANs:
1. Ensure your Mac can route to those networks
2. Use the full IP addresses
3. Consider setting up a VPN or network bridge

### Using Hostnames Instead of IPs

If your WLED devices have mDNS enabled:

```json
[
  {
    "name": "Bedroom",
    "ip": "wled-bedroom.local"
  }
]
```

**Note:** This requires mDNS/Bonjour to be enabled on your network.

## Building for Production

When you're ready to use the extension permanently:

```bash
# Build the extension
npm run build

# The extension will be available in Raycast
# No need to keep the development server running
```

## Publishing to Raycast Store (Optional)

If you want to share your extension:

```bash
npm run publish
```

Follow the prompts to submit to the Raycast Store.

## Getting Help

If you encounter issues:

1. Check the Raycast logs:
   - Open Raycast
   - Press `Cmd+Shift+,`
   - Go to Advanced > Open Extension Logs

2. Verify WLED API access in browser

3. Test with curl commands

4. Check WLED documentation: https://kno.wled.ge/

## Next Steps

Once setup is complete:
- Try the "Control WLED" command to manage devices
- Use "Set WLED Color" to apply colors
- Browse effects with "Set WLED Effect"
- Use "WLED Quick Actions" for common tasks

Happy lighting! 💡
