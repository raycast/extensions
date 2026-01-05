# Emacs Opener for Raycast

Seamlessly launch GNU Emacs from Raycast. This extension automatically detects common Emacs installations on macOS.

## Features

- 🚀 **Instant Launch**: Opens Emacs immediately.
- 🔍 **Auto-Detection**: Smartly finds your Emacs installation in:
  - **macOS**: `/Applications`, Homebrew, or PATH.
  - **Windows**: Scoop, Chocolatey, `C:\tools\emacs`, or PATH.
- ⚡ **Background Process**: Spawns Emacs as a detached process so you can close the terminal/launcher usage.

## Usage

1. Open Raycast.
2. Search for **"Open Emacs"**.
3. Hit Enter.

## Installation

This extension requires a working installation of Emacs.

### Recommended Installations

- **Homebrew Cask**: `brew install --cask emacs`
- **Emacs for Mac OS X**: Download from [emacsformacosx.com](https://emacsformacosx.com/)
- **Homebrew Formula**: `brew install emacs`

## Contributing

```bash
npm install
npm run build
```

## Credits

- Emacs Icon: [EmacsIconCollections](https://github.com/nanasess/EmacsIconCollections.git)

## License

MIT
