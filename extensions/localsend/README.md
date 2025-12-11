# LocalSend

Share files to nearby devices using the LocalSend protocol.

## Features

- **Discover Devices**: Find LocalSend devices on your local network
- **Send Files**: Select and send files to discovered devices
- **Send Clipboard**: Quickly send clipboard content to nearby devices
- **Receive Files**: Automatically receive files from other LocalSend devices
- **Customizable Settings**: Configure device name, port, and download location

## How to Use

### Sending Files

1. Use "Discover Devices" to find available devices on your network
2. Use "Send Files" to select files and send them to a device
3. Use "Send Clipboard" to quickly share clipboard content

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
- **Enable Receive**: Automatically start the receive server

## Port Configuration

By default, this extension uses port **53318** for receiving files, while the LocalSend app uses port **53317**. This allows both to run simultaneously without conflicts. You can change the port in preferences if needed.

## About LocalSend

LocalSend is a free, open-source app that allows you to securely share files and messages with nearby devices over your local network without needing an internet connection.

Learn more at [localsend.org](https://localsend.org)