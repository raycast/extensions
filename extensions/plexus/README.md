# Plexus

<img src="assets/logo-big.png" alt="Plexus Logo" width="128" height="128">

A powerful Raycast extension that helps you discover and manage all running web servers on your localhost (Node, PHP, Python, and more).

## ✨ Features

- 🔍 **Smart Discovery**: Automatically finds all running localhost web servers (any process answering HTTP), including those inside WSL
- 🏷️ **Intelligent Naming**: Detects project names from website titles or package.json files
- 🛠️ **Framework Detection**: Identifies popular frameworks (Next.js, Vite, Express, React, etc.)
- 🎨 **Favicon Support**: Shows website favicons for easy visual identification
- ⚡ **Quick Actions**: Open in browser, copy URL, or copy process ID
- 🔄 **Real-time Updates**: Always shows current running servers

## 🚀 Usage

1. Open Raycast (⌘ + Space)
2. Type "Plexus" or "Localhost search"
3. Browse through your running development servers
4. Select a server to:
   - Open it in your default browser
   - Copy the URL to clipboard
   - Copy the process ID

## 🛠️ How It Works

Plexus uses advanced process detection to:

1. Scan for Node.js processes listening on TCP ports (via `lsof`/`ps` on macOS, PowerShell on Windows)
2. Extract project information from the file system
3. Fetch website titles and favicons from running servers
4. Intelligently combine this data for the best user experience

## 🔧 Requirements

- macOS or Windows
  - macOS uses system commands like `lsof` and `ps`
  - Windows uses PowerShell (`Get-NetTCPConnection`, `Win32_Process`)
- Running Node.js development servers
- Raycast app

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 👨‍💻 Author

Created by [Rens Hoogendam](https://github.com/RensHoogendam)

---

**Tip**: Keep your development servers running and let Plexus help you navigate between them effortlessly! 🚀
