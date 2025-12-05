# Everything
A powerful Raycast extension that integrates with Everything Search by voidtools to provide lightning-fast file system search and navigation on Windows. Transform your file discovery workflow with instant search results and comprehensive directory browsing capabilities.

> **Attribution**: File search on servers ported from [anastasiy_safari/raycast-everything-ftp](https://github.com/anastasiuspernat/everything-search) <br>
> **Attribution**: File search through CLI ported from [dougfernando/everything-raycast-extension](https://github.com/dougfernando/everything-raycast-extension)

## 📦 Prerequisites

1. **Install Everything CLI**: Install the command-line interface for Everything
    - Download from [voidtools.com](https://www.voidtools.com/downloads/#cli)
    - Or install via winget:
   ```bash
   winget install --id=voidtools.Everything.Cli -e
   ```

2. **Install Everything Desktop App**: Ensure Everything is installed and running (for indexing)
   - Download from [voidtools.com](https://www.voidtools.com/)
   - Or install via winget: 
   ```bash
   winget install voidtools.Everything
   ```

## 🛠️ Configuration

### Configure Everything search on local file-system
Search files & folders on your local Windows file system using Everything CLI.

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

## 📝 Notes
The extension leverages Everything CLI's powerful search capabilities, so in theory, every `es.exe` command-line argument for filtering should work through the search interface.
