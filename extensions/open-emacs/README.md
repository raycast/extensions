# Emacs Opener for Raycast

Seamlessly launch GNU Emacs from Raycast with automatic path detection for common installation methods (Scoop, Chocolatey, and standard installs).

## Features

- 🚀 **Instant Launch**: Opens Emacs immediately without wait times.
- 🔍 **Auto-Detection**: Smartly finds your Emacs installation in:
  - Scoop: `~/scoop/apps/emacs/current/bin/runemacs.exe`
  - Chocolatey: `C:\ProgramData\chocolatey\bin\runemacs.exe`
  - Standard Tools: `C:\tools\emacs\bin\runemacs.exe`
  - System PATH
- ⚡ **Background Process**: Spawns Emacs as a detached process so you can keep working.

## Usage

1. Open Raycast.
2. Search for **"Open Emacs"**.
3. Hit Enter.

## Installation

```bash
npm install
npm run build
```

## Credits

- Emacs Icon: [EmacsIconCollections](https://github.com/nanasess/EmacsIconCollections.git)

## License

MIT
