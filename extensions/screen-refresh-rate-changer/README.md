# Screen Refresh Rate Changer

A Raycast extension for Windows that allows you to quickly change your screen refresh rate with a single command.

## Features

- 🖥️ Detect all connected displays
- ⚡ Change refresh rates quickly
- 🔧 Debug mode for development
- 🪟 Windows-only (uses PowerShell and WMI)

## Development

### Prerequisites

- [Raycast](https://raycast.com/) (Windows version)
- [Bun](https://bun.sh/) or npm
- Windows 10/11

### Setup

```powershell
# Install dependencies
bun install

# Run in development mode
bun run dev
```

### Debug Mode

The extension has a built-in debug mode that can be enabled in Raycast preferences:

1. Open the extension in Raycast
2. Press `Cmd+K` and select "Configure Extension"
3. Enable "Debug Mode" in preferences
4. Run `bun run dev`
5. Check the Raycast console for debug logs

Debug mode provides:

- Detailed console logging with `debugLog()`
- PowerShell execution verification
- Display detection details
- Cache hit/miss information
- Error stack traces

### Development Workflow

1. **Make changes** to the TypeScript files
2. **Run dev mode**: `bun run dev`
3. **Test in Raycast**: Open Raycast and run the command
4. **Check logs**: View console output and toast notifications
5. **Iterate**: Make adjustments and repeat

### Linting

```powershell
# Check for issues
bun run lint

# Auto-fix issues
bun run fix-lint
```

## Implementation Status

### ✅ Completed

- Basic project structure with modular architecture
- Debug utilities and logging
- PowerShell integration with caching
- Toast notifications and user feedback
- Error handling framework
- Display detection via WMI
- Available refresh rates enumeration
- Refresh rate changing logic
- Form UI with display and rate selection
- Auto-revert feature with configurable timeout
- LocalStorage caching for performance
- Manual cache clearing

### 🎯 Features

- **Smart Caching**: Display info and refresh rates cached for 5 minutes
- **Live Current Rate**: Always shows actual current refresh rate
- **Auto-Revert**: Optional automatic reversion after timeout
- **Manual Revert**: Quick undo with `Cmd+R`
- **Cache Management**: Clear cache with `Cmd+K`

## Technical Details

### PowerShell Integration

The extension uses `runPowerShellScript` from `@raycast/utils` to interact with Windows APIs:

- **WMI Queries**: Detect displays and their capabilities
- **Display Settings API**: Change refresh rates using Windows native APIs
- **P/Invoke**: Call Win32 functions when needed

### Architecture

```x # Main command entry point (Form UI)
└── utils/
    ├── types.ts                    # TypeScript interfaces
    ├── debug.ts                    # Debug logging utilities
    ├── powershell-scripts.ts       # PowerShell script templates
    └── display-manager.ts          # Display management with caching
```

### Caching Strategy

To improve performance and reduce lag:

- **Display Info**: Cached for 5 minutes (monitors don't change frequently)
- **Refresh Rates**: Cached per display for 5 minutes (available modes are static)
- **Current Rate**: Always fetched fresh (changes dynamically)
- **Cache Control**: Manual cache clearing available with `Cmd+K ├── Refresh rate changing
  │ └── Error handling

```

## License

MIT
```
