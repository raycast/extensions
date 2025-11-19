# Xcode Manager

Complete Xcode version management with xcodes CLI integration for Raycast.

## Features

- **Switch Xcode Versions**: Quickly select between installed Xcode versions
- **List Installed Xcodes**: View all Xcode installations on your system
- **Browse Available Versions**: See all Xcode versions available for download
- **Download Xcode**: Download specific Xcode versions
- **Install Xcode**: Download and install Xcode versions
- **Uninstall Xcode**: Remove unwanted Xcode installations
- **Manage Runtimes**: Install and manage iOS/watchOS/tvOS simulator runtimes
- **Update List**: Refresh the list of available Xcode versions

## Prerequisites

This extension requires the [xcodes](https://github.com/XcodesOrg/xcodes) CLI tool to be installed on your system.

### Installing xcodes

```bash
brew install xcodesorg/made/xcodes
```

After installation, you may need to configure your Apple ID credentials:

```bash
xcodes signin
```

## Setup

1. Install the extension from Raycast Store
2. Install xcodes CLI (see above)
3. Configure your password in any command using `Cmd+Shift+P`
   - Your password is stored securely in Raycast's local storage
   - It's only used to execute sudo commands for switching Xcode versions

## Usage

### Switching Xcode Versions

1. Open Raycast
2. Run "Select Xcode Version"
3. Choose the version you want to activate
4. If it's your first time, you'll be prompted to set up your password

### Managing Xcode Installations

- **List Installed**: View all Xcode versions on your system
- **List Available**: Browse all downloadable Xcode versions
- **Download**: Download a specific version without installing
- **Install**: Download and install a specific version
- **Uninstall**: Remove an installed version

## Security

- Your macOS password is stored locally in Raycast's secure storage
- It's only used to execute `sudo` commands for switching Xcode versions
- You can clear the saved password anytime using the "Clear Saved Password" action

## Troubleshooting

### xcodes not found

If you see "xcodes not found", make sure it's installed and in your PATH:

```bash
which xcodes
# Should return: /opt/homebrew/bin/xcodes or /usr/local/bin/xcodes
```

### Password Issues

If password authentication fails:
1. Use `Cmd+Shift+P` to reconfigure your password
2. Make sure you're entering your macOS user password (not Apple ID)

### Viewing Logs

To see detailed logs:
1. Open Console.app on macOS
2. Filter by "Raycast"
3. Look for logs prefixed with `[XCODES]`, `[AUTH]`, `[TOGGLE-XCODE]`, etc.

## Credits

- Built by [fillipeags](https://github.com/fillipeags)
- Uses [xcodes](https://github.com/XcodesOrg/xcodes) CLI by Robots and Pencils

## License

MIT
