# Windows Setup Guide

CodexBar is fully supported on Windows 11 with Raycast. This guide covers Windows-specific setup and troubleshooting.

## Requirements

- Windows 11 (Windows 10 may work but is not officially supported)
- Raycast for Windows
- Node.js 18+ (for development)

## Browser Cookie Extraction

### Chrome

1. Ensure Chrome is installed from [google.com/chrome](https://www.google.com/chrome/)
2. Login to your AI providers in Chrome
3. CodexBar will automatically extract cookies from:
   - `%LOCALAPPDATA%\Google\Chrome\User Data\Default\Network\Cookies`
   - Profile directories if using multiple profiles

### Microsoft Edge

1. Edge is pre-installed on Windows 11
2. Login to your AI providers in Edge
3. CodexBar extracts cookies from:
   - `%LOCALAPPDATA%\Microsoft\Edge\User Data\Default\Network\Cookies`

### Firefox

1. Install Firefox from [mozilla.org](https://www.mozilla.org/firefox/)
2. Login to your AI providers in Firefox
3. CodexBar extracts cookies from:
   - `%APPDATA%\Mozilla\Firefox\Profiles\*\cookies.sqlite`

### Brave

1. Install Brave from [brave.com](https://brave.com/)
2. Login to your AI providers in Brave
3. CodexBar extracts cookies from:
   - `%LOCALAPPDATA%\BraveSoftware\Brave-Browser\User Data\Default\Network\Cookies`

## Cookie Encryption

### Chrome/Edge Cookies

Chrome and Edge encrypt cookies using Windows DPAPI (Data Protection API). CodexBar handles this automatically, but in some cases you may need to:

1. Run Raycast as the same user who is logged into the browser
2. Ensure your Windows user profile is not corrupted
3. Check that the browser is fully closed (cookies may be locked)

### Firefox Cookies

Firefox stores cookies in plain SQLite, so no special handling is required.

## CLI Tool Installation

### Claude Code

```powershell
# Install via npm
npm install -g @anthropic-ai/claude-cli

# Or download from Anthropic website
# https://claude.ai/download

# Verify installation
claude --version
```

Windows install paths checked:
- `%LOCALAPPDATA%\AnthropicClaude\claude.exe`
- `%USERPROFILE%\.npm-global\claude.cmd`
- `%APPDATA%\npm\claude.cmd`

### Kiro

```powershell
# Download from Kiro website
# https://kiro.dev/download

# Or install via package manager
winget install Kiro.Kiro

# Verify installation
kiro --version
```

Windows install paths checked:
- `%LOCALAPPDATA%\Kiro\kiro.exe`
- `%PROGRAMFILES%\Kiro\kiro.exe`

### Augment (auggie)

```powershell
# Download from Augment website
# https://augmentcode.com/download

# Verify installation
auggie --version
```

Windows install paths checked:
- `%LOCALAPPDATA%\Augment\auggie.exe`
- `%PROGRAMFILES%\Augment\auggie.exe`

## Environment Variables

CodexBar uses these Windows environment variables:

| Variable | Purpose |
|----------|---------|
| `%LOCALAPPDATA%` | Local application data (Chrome, Edge cookies) |
| `%APPDATA%` | Roaming application data (Firefox cookies, npm) |
| `%USERPROFILE%` | User home directory |
| `%PROGRAMFILES%` | Program Files directory |

## Troubleshooting

### "Cookies not found" error

1. Ensure you're logged into the provider in your browser
2. Try selecting a specific browser in preferences (instead of "Auto")
3. Check that the browser is installed for the current user
4. Verify browser is not in private/incognito mode

### "CLI not found" error

1. Verify CLI is installed: `claude --version`
2. Check CLI is in your PATH: `Get-Command claude`
3. Try restarting Raycast after installing CLI
4. Check Windows Defender isn't blocking the CLI

### DPAPI errors

1. Ensure you're running Raycast as your normal user (not admin)
2. Check your Windows user profile is loaded correctly
3. Try logging out and back into Windows
4. Run `cmdkey /list` to verify credential storage is working

### Antivirus false positives

Some antivirus software may flag cookie extraction as suspicious:

1. Add Raycast to your antivirus exclusions
2. If using Windows Defender, check Protection History
3. Consider using API key authentication as an alternative

## Windows-Specific Features

### PowerShell Integration

CodexBar can use PowerShell for advanced operations:

```powershell
# Check if a CLI is installed
Get-Command claude

# View environment variables
$env:LOCALAPPDATA

# List browser profiles
Get-ChildItem "$env:LOCALAPPDATA\Google\Chrome\User Data\" -Directory
```

### Windows Terminal

CLI tools work best with Windows Terminal:

1. Install from Microsoft Store
2. Set as default terminal
3. Configure your preferred shell (PowerShell, Command Prompt, or WSL)

## Performance Tips

### Reduce Refresh Interval

On slower systems, increase the refresh interval:

1. Open CodexBar preferences
2. Set "Refresh Interval" to 10 or 15 minutes
3. Use manual refresh (`⌘ + R`) when needed

### Limit Enabled Providers

Each enabled provider adds overhead:

1. Only enable providers you actively use
2. Disable providers temporarily if not needed
3. Use the "Combined" menu bar mode to reduce API calls

## Development on Windows

### Prerequisites

```powershell
# Install Node.js
winget install OpenJS.NodeJS

# Install dependencies
npm install

# Run in development mode
npm run dev
```

### Debugging

Enable debug mode in preferences to see:
- Raw API responses
- Cookie extraction details
- CLI detection logs

### Testing

```powershell
# Run all tests
npm test

# Test specific provider
npm test -- --provider=codex

# Test cookie extraction
npm test -- --test=cookies
```

## Known Limitations

1. **Windows 10**: Not officially supported, may have issues with cookie extraction
2. **ARM64**: Limited testing on ARM64 Windows devices
3. **Enterprise environments**: Group policies may restrict cookie access
4. **Multiple users**: Can only access cookies for the current user

## Getting Help

- [GitHub Issues](https://github.com/yourusername/codexbar-raycast/issues)
- Windows-specific issues should include:
  - Windows version (`winver`)
  - Raycast version
  - Browser versions
  - CLI tool versions
  - PowerShell version (`$PSVersionTable`)

## See Also

- [Main README](../README.md)
- [Authentication Guide](AUTH_PROVIDERS.md)
- [Raycast Windows Documentation](https://developers.raycast.com/)
