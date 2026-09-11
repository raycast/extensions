# WLED Controller

Control your WLED LED strip devices directly from Raycast. Manage multiple devices, adjust colors, brightness, and apply effects with a simple, unified interface.

## Features

- **Multi-Device Management** - Add, manage, and control multiple WLED devices
- **Power Control** - Toggle devices on/off with a single action
- **Brightness Adjustment** - Set brightness (0-255) with quick presets (25%, 50%, 75%, 100%)
- **Color Selection** - Choose from 12 color presets or create custom colors
- **Custom Color Picker** - RGB sliders and hex input with two-way sync
- **Effects Browser** - Browse and apply 100+ WLED effects
- **Persistent Storage** - Devices and custom colors are saved automatically
- **Keyboard Shortcuts** - Quick access with Cmd+1 through Cmd+4 for brightness
- **Scenes** - Create scenes to quickly apply specific states to the connected devices

## Getting Started

1. Open Raycast and search for "Control WLED Devices"
2. Click "Add Device" to add your first WLED device
3. Enter device name (e.g., "Bedroom Strip") and IP address (e.g., "192.168.1.100")
4. Enable "Test Connection" to verify the device is reachable
5. Select your device to start controlling it using different actions
6. Do you have favorite color combinations? Save them as a scene and apply them with a single command

## Finding Your WLED Device IP

**Router Admin Panel** - Look for "WLED" in your connected devices list

**Device Display** - If your device has a display, the IP may be shown there

**Try Common URLs:**
- `http://wled.local`
- `http://192.168.1.X` (try common addresses)

**Network Scan** - Use tools like Angry IP Scanner or nmap:
```bash
nmap -p 80 192.168.1.0/24
```

## Keyboard Shortcuts

- `Cmd+N` - Add new device
- `Cmd+Backspace` - Delete device
- `Cmd+1` - Set 100% brightness
- `Cmd+2` - Set 75% brightness
- `Cmd+3` - Set 50% brightness
- `Cmd+4` - Set 25% brightness

## Color Options

**Presets** - 12 pre-configured colors including White, Red, Green, Blue, Orange, Purple, and more

**Custom Color Picker** - RGB sliders (0-255) with real-time hex preview and two-way synchronization

**Hex Input** - Enter any hex color code directly (e.g., #FF5500)

## Requirements

- WLED device(s) on your local network
- Device IP address (see "Finding Your WLED Device IP" above)

## Troubleshooting

**Connection Test Fails**
- Ensure device is powered on and on the same network as your Mac
- Verify the IP address is correct
- Check that no VPN is blocking local network access
- Test manually: `curl http://192.168.1.100/json`

**Device Won't Control**
- Try using "Refresh" action
- Verify device is still online
- Check if IP address changed (consider using static IPs)

## Tips

- Set DHCP reservations for your WLED devices to maintain consistent IP addresses
- Always enable "Test Connection" when adding devices
- Use keyboard shortcuts (`Cmd+1` through `Cmd+4`) for quick brightness control
- The custom color picker remembers your last used color
- Create scenes to apply colors to different devices with a single command

## About WLED

[WLED](https://kno.wled.ge/) is a fast and feature-rich implementation of an ESP8266/ESP32 webserver to control NeoPixel (WS2812B, WS2811, SK6812) LEDs. This extension uses the [WLED JSON API](https://kno.wled.ge/interfaces/json-api/) to communicate with your devices.

## License

MIT
