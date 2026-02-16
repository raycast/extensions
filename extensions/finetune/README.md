<p align="center">
  <img
    src="https://github.com/user-attachments/assets/57ae6639-b5c1-45f0-99e7-c22f8cfc938a"
    height="128"
    alt="control-volume-icon"
  />
  <h1 align="center">FineTune for Raycast</h1>
</p>
<h3 align="center">
  Built by <a href="https://github.com/MattiaIppoliti" target="_blank" rel="noopener noreferrer">MattiaIppoliti</a>
</h3>
<p align="center">
  FineTune is a Raycast extension focused for per-app audio control with a few keystrokes.
  <br />
  This repository contains the FineTune Raycast extension, documentation, and examples.
</p>

## What This Version Includes

This extension now exposes only two commands:

1. **Control App Volume**
2. **Toggle FineTune**

All other previous commands were removed.

## Commands

### Control App Volume

Shows apps with active or recent audio and lets you:

- Set per-app volume (including boost presets)
- Route an app to a specific output device (when FineTune is enabled)
- Remove per-app routing

The command is optimized to load quickly and update app status incrementally.

### Toggle FineTune

Toggles FineTune processing globally:

- **ON**:
  - Restores your previous FineTune per-app settings
  - Re-enables per-app routing/boost behavior
- **OFF**:
  - Stops applying FineTune per-app processing
  - Clears active per-app routing/volume so apps use the **system default audio device/route**
  - Keeps a backup of your previous settings so they can be restored when toggled ON again

## Requirements

- macOS 14.0+ (Sonoma or later)
- Raycast 1.26.0+
- Node.js 22.14+
- FineTune app installed at `/Applications/FineTune.app` (required for toggle + per-app FineTune processing)

## Installation

```bash
npm install
npm run dev
```

## Notes

- If FineTune is disabled, `Control App Volume` still opens and tracks active apps, but FineTune-specific routing/boost paths are disabled.
- If FineTune is not installed, toggling will fail with a clear error.
  
<p align="center">
  <img
    src="https://github.com/user-attachments/assets/f1277c87-6e46-4f30-8c5e-1a3c0152ee1f"
    height="512"
    alt="control-volume-icon-2"
  />
</p>

## License

MIT
