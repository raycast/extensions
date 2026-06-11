# Everything
A powerful Raycast extension that integrates with Everything Search by voidtools to provide lightning-fast file system search and navigation on Windows. Transform your file discovery workflow with instant search results and comprehensive directory browsing capabilities.

> **Attribution**: File search on servers ported from [anastasiy_safari/raycast-everything-ftp](https://github.com/anastasiuspernat/everything-search) <br>
> **Attribution**: File search through CLI ported from [dougfernando/everything-raycast-extension](https://github.com/dougfernando/everything-raycast-extension) <br>

## 📦 Prerequisites

You must have the **Everything** desktop app installed before using this extension. Download it from [voidtools.com](https://www.voidtools.com/downloads/) or install via winget:

```bash
winget install voidtools.Everything
```

The extension also requires the Everything CLI (`es.exe`) to perform searches. If it's not found on your system, the extension will **automatically download and install it** for you — no manual setup needed.

If you prefer to install the CLI manually, you can grab it from [voidtools.com](https://www.voidtools.com/downloads/#cli) or via winget:

```bash
winget install --id=voidtools.Everything.Cli -e
```

## 🔄 Updating the CLI

When the CLI is auto-installed by the extension, it is placed in:

```
%LOCALAPPDATA%\Microsoft\WindowsApps
```

This directory is already on your system `PATH`, so `es.exe` will be available globally. If you need to update or replace the CLI binary, swap the file at that location.

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

## ⚠️ SDK Search (Experimental)
The extension includes an experimental feature to utilize the Everything SDK module for searching. Eventually this will be swithced to be the default search method. If you experience any issues, please disable this option in the preferences and report the problem on GitHub.

### Updating bundled SDK binaries (maintainers)
The prebuilt native SDK binaries are kept under `assets/native` and version-controlled.

Fetch/update them from the source repository with:

```bash
npm run fetch-sdk-binaries
```