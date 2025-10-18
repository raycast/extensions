# Easy Device Management

The WLED Controller extension now includes an easy-to-use **Manage WLED Devices** command that makes adding, editing, and removing devices simple and intuitive!

## What Changed?

### Before
- Had to manually edit JSON in extension preferences
- Prone to syntax errors
- No way to test connections
- Difficult to manage multiple devices

### After
- ✅ **Graphical interface** for device management
- ✅ **Connection testing** before adding devices
- ✅ **Edit and delete** devices easily
- ✅ **Import/Export** configurations
- ✅ **Persistent storage** using LocalStorage

## New Command: Manage WLED Devices

Access it by typing "Manage WLED Devices" in Raycast.

### Features

#### 1. Add New Device
- Click "Add Device" or press `Cmd+N`
- Enter device name (e.g., "Bedroom Strip")
- Enter IP address (e.g., "192.168.1.100")
- Option to test connection before adding
- Automatically verifies device is reachable
- Shows device info (name, firmware version) on successful connection

#### 2. Edit Existing Device
- Select a device
- Press `Cmd+E` or choose "Edit Device"
- Update name or IP address
- Option to test new connection
- Changes saved immediately

#### 3. Delete Device
- Select a device
- Press `Cmd+Backspace` or choose "Delete Device"
- Confirmation prompt before deletion
- Device removed from all commands instantly

#### 4. Test Connection
- Select any device
- Choose "Test Connection"
- Verifies device is online and responding
- Shows detailed device info:
  - Device name
  - Firmware version
  - LED count
  - Current power state

#### 5. Export Configuration
- Press `Cmd+C` or choose "Export Configuration"
- Copies all devices to clipboard as JSON
- Can be saved as backup
- Share with others or import on another machine

#### 6. Import Configuration
- Copy JSON device configuration to clipboard
- Press `Cmd+I` or choose "Import Configuration"
- Replaces current configuration
- Validates JSON before importing
- Shows confirmation dialog

## How to Use

### First Time Setup

1. Open Raycast
2. Type: **"Manage WLED Devices"**
3. Press Enter
4. Click **"Add Device"** or press `Cmd+N`
5. Fill in the form:
   ```
   Device Name: Bedroom Strip
   IP Address: 192.168.1.100
   Test Connection: ✓ (checked)
   ```
6. Press Enter to submit
7. Device is tested and added automatically!

### Adding Multiple Devices

Repeat the process for each device:
- Living Room: 192.168.1.101
- Office: 192.168.1.102
- Kitchen: 192.168.1.103

### Editing a Device

1. Open "Manage WLED Devices"
2. Select the device you want to edit
3. Press `Cmd+E`
4. Update the name or IP
5. Press Enter to save

### Removing a Device

1. Open "Manage WLED Devices"
2. Select the device to remove
3. Press `Cmd+Backspace`
4. Confirm deletion

## Keyboard Shortcuts

- `Cmd+N` - Add new device
- `Cmd+E` - Edit selected device
- `Cmd+Backspace` - Delete selected device
- `Cmd+C` - Export configuration
- `Cmd+I` - Import configuration
- `Enter` - Test connection (when device selected)

## Connection Testing

When adding or editing a device with "Test Connection" enabled:

### ✅ Success
```
Connection Successful
Connected to Bedroom Strip (v0.14.0)
```

### ❌ Failure
```
Connection Failed
Could not reach 192.168.1.100

[Add Anyway] [Cancel]
```

You can choose to add the device anyway if:
- The device is temporarily offline
- You're configuring it for later
- The IP is correct but device is starting up

## Import/Export Format

Devices are stored as JSON:

```json
[
  {
    "name": "Bedroom Strip",
    "ip": "192.168.1.100"
  },
  {
    "name": "Living Room",
    "ip": "192.168.1.101"
  },
  {
    "name": "Office",
    "ip": "192.168.1.102"
  }
]
```

### Backup Your Configuration

1. Open "Manage WLED Devices"
2. Press `Cmd+C` to export
3. Paste into a text file
4. Save as `wled-devices-backup.json`

### Restore Configuration

1. Copy the JSON from your backup file
2. Open "Manage WLED Devices"
3. Press `Cmd+I` to import
4. Confirm import

## Technical Details

### Storage
- Devices are stored in Raycast's **LocalStorage**
- Persists across extension reloads
- No external dependencies
- No cloud sync (local only)

### Data Flow
```
Manage Devices Command
     ↓
LocalStorage (device-storage.ts)
     ↓
All Other Commands
```

### Files Added
- `src/manage-devices.tsx` - Main device management UI
- `src/device-storage.ts` - LocalStorage utilities

### Files Updated
- `package.json` - Added "manage-devices" command
- `src/control-wled.tsx` - Uses LocalStorage
- `src/set-color.tsx` - Uses LocalStorage
- `src/set-effect.tsx` - Uses LocalStorage
- `src/quick-actions.tsx` - Uses LocalStorage

### API Integration
All commands now:
1. Load devices from LocalStorage on startup
2. Show loading state while fetching
3. Display helpful empty state if no devices
4. Link to "Manage Devices" for first-time setup

## Migration from Old Preferences

The extension no longer uses the JSON preferences field. If you had devices configured in preferences:

1. Copy your old JSON from preferences
2. Open "Manage WLED Devices"
3. Press `Cmd+I` to import
4. Done! Devices are now in LocalStorage

## Troubleshooting

### "Connection Failed" When Adding Device

**Possible causes:**
- Wrong IP address
- Device is offline
- Different network/subnet
- Firewall blocking connection

**Solutions:**
- Verify IP: `ping 192.168.1.100`
- Test in browser: `http://192.168.1.100`
- Check WiFi network (same as Mac?)
- Try with "Add Anyway" option

### Device List is Empty

1. Open "Manage WLED Devices"
2. Add your first device
3. All other commands will now show your devices

### Import Failed

**Common issues:**
- Invalid JSON syntax
- Missing quotes around strings
- Trailing commas
- Not an array

**Solution:**
Validate JSON at https://jsonlint.com/

### Changes Not Reflecting in Other Commands

- Close and reopen the command
- Extensions cache devices on load
- After adding/editing, refresh other commands

## Benefits

### 🎯 User-Friendly
- No JSON editing required
- Visual interface
- Clear feedback

### 🔒 Reliable
- Connection testing prevents mistakes
- Validation before saving
- Confirmation for destructive actions

### 💾 Portable
- Export/import for backups
- Share configurations
- Easy migration

### ⚡ Fast
- LocalStorage is instant
- No network calls for device list
- Cached across extension loads

## Next Steps

1. Try adding your first device!
2. Test the connection feature
3. Explore the other commands with your devices
4. Export a backup for safekeeping

---

**Happy device managing!** 💡✨

The device management experience is now as smooth as controlling your WLED lights should be.
