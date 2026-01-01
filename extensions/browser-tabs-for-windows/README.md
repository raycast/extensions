# Browser Tabs for Windows

Search, activate, and close browser tabs from Raycast on Windows.

## Features

- **Direct Search**: Type your query immediately (Fallback Command support).
- **Window Grouping**: Tabs are grouped by their browser window title (Alt+Tab name).
- **Pinyin Search**: Support Chinese Pinyin initails (e.g. `bd` matches `百度`).
- **Bookmark Search**: Search and open bookmarks from Chrome, Edge, and Brave.
- **Bookmark Management**: Jump to browser bookmark manager with `Cmd/Ctrl + E`.

## Supported Browsers
- Chrome
- Edge
- Brave
- Vivaldi
- Firefox (Partial)

## Installation

1. Clone this repository.
2. Run `npm install` and `npm run build`.
3. Import into Raycast (Windows).

## Project Structure
- `src/`: React frontend code.
- `helper/`: C# helper source code (`BrowserTabsHelper`).
- `assets/`: Compiled helper binaries and icons.

## Development

### C# Helper

This extension uses a C# helper executable (`BrowserTabsHelper`) to interact with Windows UI Automation APIs.

**Prerequisites:**
- .NET 8.0 SDK

**Build Instructions:**

1. Navigate to the helper directory:
   ```powershell
   cd helper
   ```

2. Build the project:
   ```powershell
   dotnet build -c Release
   ```

3. Update the extension assets:
   Copy the build output to the `assets` folder.
   ```powershell
   Copy-Item "bin\Release\net8.0-windows\*" -Destination "..\assets\" -Recurse -Force
   ```

**Debugging C# Helper:**

You can run the helper directly in the terminal to test its output:
```powershell
.\assets\browser-tabs-helper.exe list         # List tabs
.\assets\browser-tabs-helper.exe bookmarks    # List bookmarks
.\assets\browser-tabs-helper.exe debug        # Show debug info
```
