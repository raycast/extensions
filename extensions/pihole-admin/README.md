# Pi-hole Admin - Raycast Extension

A complete Raycast extension to manage **Pi-hole v6** directly from Raycast. This extension has been completely rewritten to be compatible with Pi-hole v6's new REST API.

## ✨ Features

- 📊 **Status Dashboard**: View real-time Pi-hole statistics
- ⚡ **Blocking Control**: Enable/disable Pi-hole with duration options
- 📝 **Query Log**: Examine DNS queries with advanced filters
- 📈 **Top Domains**: See most queried and blocked domains
- ➕ **Domain Management**: Add domains to allowlists and blocklists
- 🗑️ **Flush Logs**: Remove all query logs
- 🔒 **Secure Authentication**: Compatible with Pi-hole v6's new session system

## 🚀 Installation

### Prerequisites

- **Pi-hole v6.0 or higher** installed and running
- **Raycast** installed on your Mac
- **Node.js 18+** for development

### Installation Steps

1. **Configure the extension**
   - Go to Raycast Preferences → Extensions → Pi-hole Admin
   - Configure the following parameters:
     - **Pi-hole URL**: The complete URL of your Pi-hole (e.g., `http://192.168.1.100` or `https://pi.hole`)
     - **Admin Password**: Pi-hole administrator password
     - **Verify SSL**: Enable if using HTTPS with valid certificates

## 🔧 Pi-hole v6 Configuration

This extension requires Pi-hole v6 with the new REST API. If you have an older version, you'll need to update:

```bash
# Update Pi-hole to v6
pihole -up
```

### ⚠️ Required Configuration for Multiple Sessions (Only if extension has issues)

Pi-hole v6 by default limits concurrent sessions. To avoid conflicts with the web interface while using this extension, **you must increase the session limit**:

1. **Edit the configuration file**:
   ```bash
   sudo nano /etc/pihole/pihole.toml
   ```

2. **Modify the `[webserver.api.auth]` section**:
   ```toml
   [webserver.api.auth]
   max_sessions = 16  # Change to 100 or more (you can test until you find what works correctly)
   ```

3. **Restart Pi-hole**:
   ```bash
   sudo systemctl restart pihole-FTL
   ```

### HTTPS Configuration (Optional)

If your Pi-hole uses HTTPS, make sure to:

1. **With valid certificates**: Keep "Verify SSL" enabled
2. **With self-signed certificates**: Disable "Verify SSL" in preferences

## 📋 Available Commands

### 🏠 View Status
- **Description**: Main dashboard with Pi-hole statistics
- **Features**:
  - Current status (active/disabled)
  - Total and blocked queries today
  - Blocking percentage
  - System information

### ⚡ Enable/Disable Blocking
- **Description**: Complete control of Pi-hole status
- **Disable options**:
  - 5 minutes
  - 30 minutes
  - 1 hour
  - 2 hours
  - Permanent

### 📝 View Query Log
- **Description**: Examine recent DNS queries
- **Features**:
  - Filter by status (blocked/allowed)
  - Search by domain, client, or type
  - Detailed information for each query
  - Quick actions from the log

### 📊 Top Domains
- **Description**: Statistics of most queried domains
- **Available views**:
  - Most queried allowed domains
  - Most frequent blocked domains
  - Top clients by number of queries

### ➕ Add Domain
- **Description**: Add domains to allowlists or blocklists
- **Features**:
  - Domain format validation
  - List type selection
  - Optional comment field

### 🗑️ Flush Logs
- **Description**: Remove all query logs
- **Security**: Requires confirmation before execution

## 🔧 Troubleshooting

### Authentication Error
- Verify that the password is correct
- Make sure Pi-hole v6 is running
- Check Pi-hole URL (include http:// or https://)

### Connection Error
- Confirm that Pi-hole is accessible from your Mac
- If using HTTPS, verify SSL configuration
- Check that no firewalls are blocking the connection

### Commands Don't Appear
- Make sure the extension is enabled in Raycast
- Restart Raycast if necessary
- Verify that all dependencies are installed

## 🌟 Supported Pi-hole v6 Features

- ✅ New REST API
- ✅ Session-based authentication (SID)
- ✅ Embedded web server
- ✅ Server-side pagination
- ✅ Consolidated configuration (pihole.toml)
- ✅ Native HTTPS support

## ☕ Support

If you find this extension useful, consider buying me a coffee to support development:

[![Buy Me A Coffee](https://img.shields.io/badge/-buy_me_a%C2%A0coffee-gray?logo=buy-me-a-coffee)](https://coff.ee/vandertoorm)

## 📄 License

MIT License - see the [LICENSE](LICENSE) file for more details.

## 🙏 Acknowledgments

- [Pi-hole](https://pi-hole.net/) team for the excellent software
- [Raycast](https://raycast.com/) team for the extension platform
- Developer community that keeps Pi-hole updated

---

**Issues or suggestions?** Open an issue in this repository. 