
# Clipaste Raycast Extension

A comprehensive Raycast extension for the [clipaste](https://github.com/markomanninen/clipaste) CLI tool that provides a keyboard-first interface for clipboard management with support for pasting, copying, AI processing, and random data generation.

## ✨ Features

- **Multi-mode Operations**: Support for paste, copy, AI, and random modes
- **Recipe System**: 20+ predefined recipes for common operations
- **Image Support**: Preview and handle clipboard images with pngpaste integration
- **Random Data Generation**: Generate passwords, UUIDs, Finnish IDs, IBANs, and more
- **Smart Form**: Dynamic form that adapts based on selected mode and options
- **Output Management**: Configurable output directories with desktop default
- **Error Handling**: Comprehensive error handling with helpful messages

## 🚀 Quick Installation

### Automated Installation (Recommended)

1. **Clone and install:**

   ```bash
   git clone https://github.com/markomanninen/raycast-clipaste.git
   cd raycast-clipaste
   chmod +x install.sh
   ./install.sh
   ```

   The script will automatically:
   - Install Homebrew (if needed)
   - Install Node.js (if needed)
   - Install pngpaste for image support
   - Detect and configure clipaste paths
   - Build and set up the extension

2. **Manual clipaste installation (if not already installed):**

   ```bash
   # Install clipaste from source or binary
   # See: https://github.com/markomanninen/clipaste
   ```

### Manual Installation

If you prefer manual installation:

1. **Install dependencies:**

   ```bash
   # Install Raycast first from https://raycast.com
   # Install Raycast CLI
   npm install -g @raycast/api
   
   # Install Homebrew (if not already installed)
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Install Node.js and pngpaste
   brew install node pngpaste
   ```

2. **Install clipaste:**

   ```bash
   # Follow installation instructions at:
   # https://github.com/markomanninen/clipaste
   ```

3. **Set up extension:**

   ```bash
   git clone https://github.com/markomanninen/raycast-clipaste.git
   cd raycast-clipaste
   npm install
   npm run build
   npm run dev  # This registers the extension with Raycast
   ```

## ⚙️ Configuration

After installation, configure the extension in Raycast:

1. Open Raycast (⌘+Space)
2. Type "Extensions" and open Raycast Extensions
3. Find "Clipaste Launcher" and click the gear icon
4. Configure these settings:

### Essential Settings

- **clipaste binary**: Path to clipaste executable
  - Try: `clipaste` (if on PATH) or `/usr/local/bin/clipaste` or `~/bin/clipaste`
- **Default Output Directory**: Where files are saved (default: `~/Desktop`)
- **Enable pngpaste fallback**: Enable for image clipboard support
- **pngpaste binary**: Path to pngpaste (usually `/opt/homebrew/bin/pngpaste`)

### Path Detection

The install script automatically detects common installation paths:

- `~/bin/clipaste`
- `/usr/local/bin/clipaste`
- `/opt/homebrew/bin/clipaste`
- `~/.local/bin/clipaste`

## 🎯 Usage

1. **Open the extension:**
   - Press ⌘+Space to open Raycast
   - Type "Clipaste Launcher" or just "clipaste"

2. **Choose your mode:**
   - **Paste**: Save clipboard content to files
   - **Copy**: Copy files/directories to clipboard
   - **AI**: Process clipboard with AI (requires API key)
   - **Random**: Generate random data

3. **Use recipes or custom options:**
   - Select from 20+ predefined recipes
   - Or configure custom options in the form

4. **Execute and view results:**
   - Results stay visible after completion
   - Success notification appears as toast

## 📋 Supported Operations

### Paste Mode

- Save clipboard text to files
- Handle images (with pngpaste)
- Auto-detect file extensions
- Batch operations

### Copy Mode  

- Copy files/directories to clipboard
- Support for multiple file selection
- Preserve file metadata

### AI Mode

- Process clipboard content with AI
- Requires OpenAI API key configuration
- Custom prompts and processing

### Random Mode

- **Passwords**: Various character sets and lengths
- **UUIDs**: Multiple UUID versions
- **Finnish Data**: Personal IDs (Hetu), IBANs, Business IDs
- **Templates**: Custom random data patterns

## 🔧 Troubleshooting

### Common Issues

#### ❌ "Command failed with exit code 1"

- Check that clipaste binary path is correct in preferences
- Try running `clipaste --version` in terminal to verify installation

#### ❌ "EROFS: read-only file system"

- Set a "Default Output Directory" in extension preferences
- Or specify output directory in the form when using paste mode
- The extension now defaults to ~/Desktop when no path is specified

#### ❌ "clipaste: command not found"

- Install clipaste: <https://github.com/markomanninen/clipaste>
- Make sure the binary is in your PATH or set full path in preferences

#### ❌ Image preview not working

- Install pngpaste: `brew install pngpaste`
- Enable "pngpaste fallback" in extension preferences
- Set correct pngpaste path (usually `/opt/homebrew/bin/pngpaste`)

### Debug Steps

1. **Verify clipaste installation:**

   ```bash
   which clipaste
   clipaste --version
   ```

2. **Verify pngpaste installation:**

   ```bash
   which pngpaste
   pngpaste --help
   ```

3. **Check extension logs:**
   - Open Raycast Developer Tools
   - Look for error messages in console

4. **Test basic functionality:**

   ```bash
   # Test clipaste directly
   echo "test" | pbcopy
   clipaste paste --output ~/Desktop
   ```

## 📦 Distribution

### For End Users

Download the latest release from the releases page and follow the installation instructions.

### For Developers

```bash
# Build for distribution
npm run build

# Publish to Raycast Store (requires approval)
npm run publish
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Make changes and test thoroughly
4. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🔗 Related Projects

- [clipaste CLI](https://github.com/markomanninen/clipaste) - The core CLI tool
- [clipaste-randomizer](https://github.com/markomanninen/clipaste-randomizer) - Random data generation plugin
