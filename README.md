# 🚫 SiteBlocker - Raycast Extension

A powerful and easy-to-use Raycast extension for blocking distracting websites on macOS. Boost your productivity by blocking access to time-wasting sites with just a few keystrokes.

## ✨ Features

- **Quick Website Addition**: Add websites to your block list with a simple form interface
- **One-Click Blocking**: Enable/disable blocking for all websites instantly
- **Secure Implementation**: Uses macOS native authentication for system file modifications
- **Automatic Backup**: Creates backup of your hosts file before modifications
- **Smart Domain Processing**: Automatically handles URLs, protocols, and paths
- **Visual Management**: View, organize, and delete blocked websites in a clean interface
- **Persistent Storage**: Your block list persists across system restarts

## 🎯 Commands

### 1. Add Website to Block ➕
Opens a form where you can:
- Enter a website domain (e.g., `youtube.com`, `facebook.com`)
- Add optional notes explaining why you're blocking it
- Automatic URL sanitization (removes protocols, www, paths)

### 2. Enable Site Blocking 🚫
- Activates blocking for all websites in your list
- Modifies `/etc/hosts` file to redirect blocked sites to localhost
- Requires administrator password (uses native macOS dialog)
- Creates automatic backup at `/etc/hosts.siteblocker.bak`

### 3. Disable Site Blocking ✅
- Deactivates all website blocking
- Safely removes SiteBlocker entries from hosts file
- Restores normal website access
- Preserves your block list for future use

### 4. View Blocked Sites 📋
- Shows all websites in your block list
- Displays blocking status (active/inactive)
- Delete individual websites with ⌘⌫
- Shows date added and notes for each site

## 🔧 Installation

### Prerequisites
- macOS 10.15 or later
- Raycast app installed
- Node.js 16+ (for development)

### For Users
1. Download the extension from Raycast Store (when published)
2. Install through Raycast preferences

### For Developers
```bash
# Clone the repository
git clone https://github.com/yourusername/raycast-siteblocker.git
cd raycast-siteblocker

# Install dependencies
npm install

# Development mode
npm run dev

# Build for production
npm run build
```

## 🔐 Security & Privacy

### How It Works
SiteBlocker works by modifying your system's `/etc/hosts` file, which is a standard method for blocking websites on Unix-like systems. When a website is blocked, requests to that domain are redirected to `127.0.0.1` (your local machine), effectively making the site unreachable.

### Security Features
- **Native Authentication**: Uses macOS's built-in authentication dialog
- **Automatic Backups**: Creates `/etc/hosts.siteblocker.bak` before any modifications
- **Tagged Entries**: All modifications are clearly marked with `# SiteBlocker` tags
- **Safe Removal**: Only removes entries that were added by SiteBlocker
- **No Network Access**: Extension works entirely offline

### Permissions Required
- **Administrator Access**: Required to modify `/etc/hosts` file
- **Local Storage**: To persist your block list settings

## 📖 Usage Examples

### Blocking Social Media During Work Hours
1. Run "Add Website to Block"
2. Enter `facebook.com` with note "Work distraction"
3. Add `twitter.com`, `instagram.com`, `tiktok.com`
4. Run "Enable Site Blocking" when starting work
5. Run "Disable Site Blocking" when work is done

### Temporary Website Blocking
- Add websites to your list once
- Use "Enable"/"Disable" commands to toggle blocking as needed
- Your list persists even when blocking is disabled

## 🛠️ Troubleshooting

### "Authentication was canceled"
- You canceled the password prompt
- Try the command again and enter your password

### "Administrator privileges are required but sudo is not available"
- Your system configuration may be restricting administrative access
- Contact your system administrator

### Websites still loading after enabling blocking
- Clear your browser's DNS cache
- Try opening the website in a private/incognito window
- Restart your browser

### Restoring Original Hosts File
If you need to restore your original hosts file:
```bash
sudo cp /etc/hosts.siteblocker.bak /etc/hosts
```

### DNS Cache Issues
If websites are still accessible, flush your DNS cache:
```bash
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder
```

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Bug Reports**: Open an issue describing the problem
2. **Feature Requests**: Suggest new features or improvements
3. **Code Contributions**: Fork the repo and submit a pull request
4. **Documentation**: Help improve our docs and examples

### Development Setup
```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run linting
npm run lint

# Fix linting issues
npm run fix-lint

# Build for production
npm run build
```

## 📋 Technical Details

### File Structure
```
src/
├── lib/
│   ├── domainUtils.ts    # Domain validation and sanitization
│   ├── storage.ts        # LocalStorage management
│   └── hostsManager.ts   # Hosts file operations
├── add-website.tsx       # Add website command
├── enable-blocking.tsx   # Enable blocking command
├── disable-blocking.tsx  # Disable blocking command
└── view-blocked-sites.tsx # View/manage sites command
```

### Data Storage
- **Local Storage Keys**: 
  - `blocked-domains`: Array of blocked domain objects
  - `blocking-status`: Current blocking state and timestamps
- **Domain Format**: Stored as lowercase, sanitized domain names
- **Backup Location**: `/etc/hosts.siteblocker.bak`

### Hosts File Format
```
# SiteBlocker - Added by Raycast SiteBlocker Extension
127.0.0.1 facebook.com # SiteBlocker
127.0.0.1 youtube.com # SiteBlocker
```

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Raycast](https://raycast.com) for the excellent extension platform
- macOS hosts file blocking technique
- The open-source community for inspiration and feedback

## 📊 Version History

### v1.0.0
- Initial release
- Core blocking functionality
- Website management interface
- Secure hosts file modifications
- Automatic backups

---

**Made with ❤️ for productivity enthusiasts**