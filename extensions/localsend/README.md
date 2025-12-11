# LocalSend

Share files to nearby devices using the LocalSend protocol.

## Features

- **Discover Devices**: Find LocalSend devices on your local network
- **Send Files**: Select and send files to discovered devices
- **Send Clipboard**: Quickly send clipboard content to nearby devices
- **Receive Files**: Automatically receive files from other LocalSend devices
- **Menu Bar Status**: Toggle discovery and receive server from your menu bar
- **Favorite Devices**: Star devices for quick access
- **Customizable Settings**: Configure device name, port, and download location

## How to Use

### Making Your Computer Discoverable

**Option 1: Menu Bar (Recommended)**
- Enable the "LocalSend Status" menu bar command
- Click the menu bar icon to toggle discovery on/off
- Green icon = fully online, Yellow = partial, Red = offline

**Option 2: Preferences**
- Open extension preferences (`Cmd + ,`)
- Check "Make this device discoverable"
- Discovery will start automatically in the background

### Sending Files

1. Use "Discover Devices" to find available devices on your network
2. Use "Send Files" to select files and send them to a device
3. Use "Send Clipboard" to quickly share clipboard content
4. Star frequently used devices for quick access

### Receiving Files

Files can be received automatically if enabled in preferences:

1. Open extension preferences (`Cmd + ,` while in the extension)
2. Check "Enable receiving files" to start the receive server
3. Received files will be saved to your configured download folder (default: ~/Downloads)

### Settings

Access extension preferences (`Cmd + ,`) to configure:

- **Device Name**: How your device appears to others (defaults to your computer name)
- **HTTP Port**: Port for receiving files (default: 53318, to avoid conflicts with LocalSend app on port 53317)
- **Download Folder**: Where received files are saved (default: ~/Downloads)
- **Enable Discovery**: Announce this device on the network (default: enabled)
- **Enable Receive**: Automatically start the receive server (default: disabled)

## Port Configuration

By default, this extension uses port **53318** for receiving files, while the LocalSend app uses port **53317**. This allows both to run simultaneously without conflicts. You can change the port in preferences if needed.

## About LocalSend

LocalSend is a free, open-source app that allows you to securely share files and messages with nearby devices over your local network without needing an internet connection.

Learn more at [localsend.org](https://localsend.org)