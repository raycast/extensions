# NordPass Raycast Extension

Search through your NordPass passwords, credit cards, and secure notes directly from Raycast with fast, secure local search.

## ✨ Features

- 🔍 **Fast Search** - Instantly search through passwords, credit cards, and secure notes
- 📋 **Quick Copy** - Copy credentials to clipboard with one keystroke
- 🔄 **Auto-Refresh** - Automatically detects when you export new data from NordPass
- 🔒 **Secure** - All data encrypted and stored locally on your machine
- ⚡ **Cached** - Lightning-fast search with intelligent local caching

## 🚀 Quick Start

### Step 1: Export Your NordPass Data

1. Open **NordPass** (desktop app or web vault)
2. Navigate to **Settings** → **Export** (or **Tools** → **Export**)
3. Choose **CSV format**
4. Save the file to a secure location:
   ```bash
   # Create a secure hidden directory (recommended)
   mkdir -p ~/.nordpass
   ```
   Save your export as: `~/.nordpass/export.csv`

   > 💡 **Tip**: The extension will automatically find files in `~/.nordpass/` directory!

### Step 2: Install the Extension

1. Open **Raycast**
2. Press `⌘ Space` to open Raycast
3. Type "Store" and open **Raycast Store**
4. Search for "NordPass" and install the extension

### Step 3: Configure (Optional)

1. Open Raycast Preferences (`⌘ ,`)
2. Go to **Extensions** → **NordPass**
3. **Export File Path** (optional):
   - Leave **empty** to auto-detect (recommended)
   - Or enter the full path: `~/.nordpass/export.csv`

### Step 4: Start Using!

1. Open Raycast (`⌘ Space`)
2. Search for:
   - **"Search Passwords"** - Find and copy passwords
   - **"Search Credit Cards"** - Find and copy card details
   - **"Search Secure Notes"** - Find and copy secure notes
3. Type to search, press `Enter` to copy!

## 📖 Commands

| Command | Description | Shortcuts |
|---------|-------------|-----------|
| **Search Passwords** | Search and copy passwords, usernames, and URLs | `Cmd+R` to refresh |
| **Search Credit Cards** | Search and copy card numbers, CVV, and expiry dates | `Cmd+R` to refresh |
| **Search Secure Notes** | Search and copy secure notes | `Cmd+R` to refresh |

### Keyboard Shortcuts

- `Enter` - Copy password/credential to clipboard
- `Cmd+R` - Refresh cache from export file
- `Cmd+Shift+Delete` - Clear cache
- `Cmd+U` - Copy URL (when viewing password)
- `Cmd+N` - Copy note (when available)

## 🔒 Security

### Built-in Security

✅ **Encrypted Cache** - All cached data encrypted with AES-256-GCM  
✅ **Secure Permissions** - Files restricted to owner-only access (600)  
✅ **Local Only** - No data sent to external servers  
✅ **Read-Only** - Export files never modified by extension  
✅ **System-Specific Keys** - Cache can only be decrypted on your machine  

### Securing Your Export File

**IMPORTANT**: Your CSV export contains sensitive data. Follow these steps:

#### 1. Store Securely

**Recommended locations:**
- `~/.nordpass/export.csv` (hidden directory - auto-detected)
- `~/Documents/.secure/nordpass-export.csv` (hidden secure folder)
- `~/Library/Application Support/NordPass/export.csv` (app support)

**Avoid:**
- ❌ `~/Downloads/` (often synced to cloud)
- ❌ `~/Desktop/` (visible and often synced)
- ❌ Cloud storage folders (iCloud, Dropbox, etc.)

#### 2. Set File Permissions

The extension automatically secures your export file, but you can also do it manually:

```bash
chmod 600 ~/.nordpass/export.csv
```

#### 3. Enable FileVault (macOS)

Ensure full disk encryption is enabled:
- **System Settings** → **Privacy & Security** → **FileVault**
- Turn on FileVault to encrypt all data at rest

#### 4. Optional: Encrypt the CSV File

For additional security, encrypt your export file:

```bash
# Using macOS Disk Image (recommended)
hdiutil create -encryption AES-256 -size 10m -fs HFS+ -volname "NordPass Export" ~/nordpass-export.dmg
# Copy CSV into mounted image, then eject

# Or using OpenSSL
openssl enc -aes-256-cbc -salt -in nordpass-export.csv -out nordpass-export.csv.enc
```

#### 5. Delete After Setup (Optional)

Once the extension has cached your data, you can delete the CSV file:
- The extension stores everything encrypted locally
- You only need the CSV when exporting new data
- Keep it in `~/.nordpass/` for periodic updates

### Security Best Practices

1. ✅ Store export file in hidden directory (`~/.nordpass/`)
2. ✅ Enable FileVault for full disk encryption
3. ✅ Set restrictive file permissions (automatic)
4. ✅ Delete CSV after setup (optional - extension caches data)
5. ✅ Regularly update export when passwords change
6. ✅ Never sync export file to cloud services
7. ✅ Use strong master password in NordPass

## 🔄 Updating Your Data

When you add or change passwords in NordPass:

1. Export a new CSV from NordPass
2. Save it to the same location (e.g., `~/.nordpass/export.csv`)
3. In Raycast, press `Cmd+R` in any command to refresh
4. Or the extension will auto-detect changes on next use

## 🛠 Troubleshooting

### Export File Not Found

**Symptoms**: "Export file not found" error message

**Solutions**:
1. Verify the file exists: `ls -la ~/.nordpass/`
2. Check file path in preferences (Raycast → Preferences → Extensions → NordPass)
3. Try full absolute path: `/Users/yourusername/.nordpass/export.csv`
4. Ensure file has `.csv` extension

### Data Not Updating

**Symptoms**: Old passwords showing after export

**Solutions**:
1. Press `Cmd+R` to manually refresh cache
2. Verify new export file was saved
3. Check file modification time: `ls -l ~/.nordpass/export.csv`
4. Clear cache: `Cmd+Shift+Delete` then refresh

### No Items Showing

**Symptoms**: Empty list after setup

**Solutions**:
1. Verify CSV file contains data (open in text editor)
2. Check CSV format matches NordPass export
3. Try refreshing cache: `Cmd+R`
4. Check terminal/console for error messages

### Permission Errors

**Symptoms**: Cannot read export file

**Solutions**:
```bash
# Set correct permissions
chmod 600 ~/.nordpass/export.csv

# Verify permissions
ls -l ~/.nordpass/export.csv
# Should show: -rw------- (600)
```

## 📋 Requirements

- **Raycast** (latest version)
- **NordPass** account
- **macOS** or **Windows**
- CSV export from NordPass

## 🤝 Contributing

Found a bug or have a feature request? Please open an issue on GitHub!

## 📄 License

MIT License - feel free to use and modify as needed.

## ⚠️ Disclaimer

This extension is not officially affiliated with NordPass. It's a community-built tool that reads exported CSV data. Always follow NordPass's security recommendations when exporting sensitive data.

---

**Made with ❤️ for the Raycast community**
