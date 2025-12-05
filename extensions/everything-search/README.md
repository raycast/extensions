# Everything Extension for Raycast (Windows)

![Screenshot showing the main search interface](./metadata/everything-search-1.png)

![Quick demo showing the extension in action](./media/demo.gif)

A powerful Raycast extension that integrates with Everything CLI to provide lightning-fast file system search and navigation on Windows. Transform your file discovery workflow with instant search results and comprehensive directory browsing capabilities.

> **Attribution**: Initially inspired by the [PuttTim/windows-terminal](https://github.com/PuttTim/windows-terminal) project structure & setup. <br>
> **Attribution**: File search on servers ported from [anastasiy_safari/raycast-everything-ftp](https://github.com/anastasiuspernat/everything-search)

## 📦 Installation

1. **Install Everything CLI**: Install the command-line interface for Everything
   ```bash
   winget install --id=voidtools.Everything.Cli -e
   ```

2. **Install Everything Desktop App**: Ensure Everything is installed and running (for indexing)
   - Download from [voidtools.com](https://www.voidtools.com/)
   - Or install via: 
   ```bash
   winget install voidtools.Everything
   ```

## 🛠️ Configuration

Access the extension preferences in Raycast to customize:

- **Everything CLI Path**: Custom path to es.exe (leave empty to use system PATH)
- **File Explorer Command**: Custom file manager command (use `%s` as path placeholder)
- **Default Action**: Choose between opening files or folders as primary action
- **Default Sort**: Choose default sorting method for search results
- **Search Threshold**: Minimum characters required before search starts (default: 3)

### Configure Everything search on servers (ETP/FTP)

Search files & folders on multiple Windows Everything ETP/FTP servers from Raycast. 

1. Enable Tools > Options > ETP/FTP Server in Everything on your Windows computers.
2. Configure the servers in the extension settings (see below).
3. Use *search-servers* command followed by the mask. (this command is disabled by default)

Configure the servers in the extension settings using the following format:

```json
[
  {
    "name": "Server 1",
    "host": "server-url",
    "port": 21,
    "user": "username",
    "pass": "password"
  },
  {
    "name": "Server 2",
    "host": "server-url",
    "port": 21,
    "user": "username",
    "pass": "password"
  }
]
```

## 💡 Usage Tips

- **Quick Search**: Start typing immediately - no need to wait for interface loading
- **Directory Navigation**: Use the "Browse Directory" action on folders to explore contents
- **File Preview**: Toggle detail view (`Ctrl+Shift+I`) to preview text files
- **Keyboard Shortcuts**: 
  - `Ctrl+C` / `Cmd+C`: Copy file name
  - `Ctrl+Shift+C` / `Cmd+Shift+C`: Copy full path
  - `Ctrl+Shift+.`: Copy file to clipboard
  - `Ctrl+Shift+I` / `Cmd+Shift+I`: Toggle details

## 🔧 Development

### Setting up Environment

If you want to contribute to this extension or run it locally:

1. **Node.js**: Install the latest version
   ```bash
   winget install -e --id OpenJS.NodeJS
   ```

2. **Clone and Setup**: Clone the repository and install dependencies
   ```bash
   git clone <repository-url>
   cd everything-raycast-extension
   npm install
   ```

### Available Scripts
- **Development**: `npm run dev` - Start development mode with hot reload
- **Build**: `npm run build` - Build extension for distribution
- **Lint**: `npm run lint` - Run ESLint and Prettier checks
- **Fix Linting**: `npm run fix-lint` - Automatically fix linting issues
- **Publish**: `npm run publish` - Publish extension to Raycast store

### Architecture Overview
- **Main Component**: `src/search-everything.tsx` - Primary React component handling search and navigation
- **Everything CLI Integration**: Uses Windows `es.exe` for file indexing and search
- **File Preview System**: Intelligent text file detection and preview for 20+ file types
- **Windows-Specific Features**: PowerShell integration for elevated permissions

## 📝 Notes

> **Author Note**: Native "Search Files" was not working on my machine, so I created this as a temporary workaround that evolved into a comprehensive file navigation solution.

The extension leverages Everything CLI's powerful search capabilities, so in theory, every `es.exe` command-line argument for filtering should work through the search interface.
