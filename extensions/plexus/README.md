# Plexus

<img src="assets/logo-big.png" alt="Plexus Logo" width="128" height="128">

A powerful Raycast extension that helps you discover and manage all running Node.js development servers on your localhost.

## ✨ Features

- 🔍 **Smart Discovery**: Automatically finds all running Node.js servers on your machine
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

<!-- ## 📸 Screenshots

The extension displays:
- **Project Name**: Automatically detected from website title or package.json
- **Framework**: Detected framework (Next.js, Vite, Express, etc.)
- **URL**: Full localhost URL with port
- **Port**: Quick reference to the port number
- **Favicon**: Website icon for visual identification -->

## 🛠️ How It Works

Plexus uses advanced process detection to:
1. Scan for Node.js processes listening on TCP ports
2. Extract project information from the file system
3. Fetch website titles and favicons from running servers
4. Intelligently combine this data for the best user experience

## 🔧 Requirements

- macOS (uses system commands like `lsof` and `ps`)
- Running Node.js development servers
- Raycast app

## 📦 Installation

Install directly from the [Raycast Store](https://raycast.com/RensHoogendam/plexus) or:

1. Clone this repository
2. Open terminal in the project directory
3. Run `npm install && npm run build`
4. Import the extension in Raycast

## 🤝 Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 👨‍💻 Author

Created by [Rens Hoogendam](https://github.com/RensHoogendam)

---

**Tip**: Keep your development servers running and let Plexus help you navigate between them effortlessly! 🚀