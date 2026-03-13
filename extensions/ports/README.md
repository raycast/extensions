# Port Manager

A powerful Raycast extension for monitoring and managing open ports on your system. Quickly view all active TCP ports, identify which processes are using them, and terminate processes with a single action. Platform support for Windows.

![Port Manager Extension](metadata/screenshot1.png)

## Features

- **Cross-Platform**: Full support for both Windows and macOS systems
- **Port Monitoring**: View all open TCP ports on your system in real-time
- **Process Identification**: See which processes are using specific ports with process names and PIDs
- **Quick Process Termination**: Kill processes using specific ports with a single action
- **Direct Port Killing**: Kill processes by port number directly from Raycast search (e.g., "kill port 3000")
- **Search & Filter**: Search through ports by address, PID, or process name
- **Copy Actions**: Copy port addresses, PIDs, or process names to clipboard
- **Keyboard Shortcuts**: Quick actions with customizable shortcuts for both platforms
- **Real-time Updates**: Refresh the port list to see current system state
- **Error Handling**: Robust error handling with user-friendly notifications

## Screenshots

### Main Interface

![Port Manager Interface](metadata/screenshot1.png)

### Action Panel

![Action Panel](metadata/screenshot2.png)

## Installation

1. Install [Raycast](https://raycast.com/) on your Windows system
2. Open Raycast and search for "Port Manager"
3. Install the extension from the Raycast Store
4. Grant necessary permissions when prompted

## Usage

### Opening Port Manager

- **Windows**: Open Raycast (`Win + Space` by default)
- Type "Manage Open Ports" or "ports"
- Press Enter to launch the extension

### Quick Port Killing

The fastest way to kill a process by port number:

1. Open Raycast
2. Type "kill port" followed by the port number (e.g., "kill port 3000")
3. Press Enter
4. The process using that port will be terminated immediately

### Managing Ports (Full Interface)

1. **View Ports**: All open TCP ports are displayed with their local addresses
2. **Identify Processes**: Each port shows the process name and PID using it
3. **Search**: Use the search bar to filter by port address, PID, or process name
4. **Kill Process**: Select a port and use the keyboard shortcut or "Kill Process" action
5. **Refresh**: Use the keyboard shortcut or "Refresh List" action to update the port list

### Available Actions

| Action            | Windows Shortcut | Description                                    |
| ----------------- | ---------------- | ---------------------------------------------- |
| Kill Process      | `Ctrl+Shift+K`   | Terminate the process using the selected port  |
| Refresh List      | `Ctrl+Shift+R`   | Update the port list with current system state |
| Copy Process Name | -                | Copy the process name to clipboard             |
| Copy Address      | -                | Copy the port address to clipboard             |
| Copy PID          | -                | Copy the process ID to clipboard               |

## Commands

This extension provides two commands:

### 1. Manage Open Ports
**Command**: `Manage Open Ports`
**Description**: Opens the full port management interface showing all listening ports

### 2. Kill Port
**Command**: `Kill Port <port_number>`
**Arguments**: Port number (1-65535)
**Description**: Directly terminates the process using the specified port
**Examples**:
- `kill port 3000` - Kills process using port 3000
- `kill port 8080` - Kills process using port 8080
- `kill port 5432` - Kills process using port 5432

**Safety Features**:
- Validates port numbers (1-65535)
- Prevents termination of system ports (80, 443, 22, etc.)
- Shows process name before termination
- Provides clear success/failure feedback

## Technical Details

### System Requirements

- **Windows**: Windows 10/11
- Raycast application
- Administrator/root privileges (for process termination)

### How It Works

The extension automatically detects your operating system and uses the appropriate system commands:

#### Windows

- `netstat -ano -p tcp`: Lists all TCP connections and their associated PIDs
- `tasklist /fo csv`: Retrieves process names for the identified PIDs
- `taskkill /PID <pid> /F`: Terminates processes by their PID

### Architecture

- **Frontend**: React-based UI using Raycast's API
- **OS Detection**: Automatic platform detection using Node.js process.platform
- **Port Detection**: Native system commands via Node.js child_process
- **Process Management**: Platform-specific command execution for process termination
- **State Management**: React hooks for real-time UI updates

## Development

### Prerequisites

- Node.js 18+
- npm or yarn
- Raycast CLI

### Setup

```bash
# Clone the repository
git clone <repository-url>
cd ports

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Available Scripts

- `npm run dev` - Start development mode
- `npm run build` - Build the extension
- `npm run lint` - Run ESLint
- `npm run fix-lint` - Fix ESLint issues
- `npm run publish` - Publish to Raycast Store

### Project Structure

```
ports/
├── src/
│   ├── index.tsx          # Main port management interface
│   └── kill-port.tsx      # Direct port killing command
├── lib/
│   ├── fetchPorts.ts      # Cross-platform port detection logic
│   └── killProcess.ts     # Cross-platform process termination logic
├── metadata/
│   ├── screenshot1.png    # Main interface screenshot
│   └── screenshot2.png    # Action panel screenshot
├── assets/
│   └── extension.png      # Extension icon
└── package.json           # Extension configuration
```

## Platform-Specific Notes

### Windows

- Requires Windows 10 or later
- May require running Raycast as Administrator for process termination
- Uses Windows built-in networking commands (netstat, tasklist, taskkill)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Author

**dleteliers\_**

#### Enhanced

- **Port Detection**: Improved port detection logic for both platforms
- **Process Management**: Platform-appropriate process termination methods
- **Error Handling**: Better error messages and platform-specific troubleshooting
- **Documentation**: Updated documentation with platform-specific instructions

## Support

If you encounter any issues or have questions:

1. Check the [Issues](https://github.com/your-username/ports/issues) page
2. Create a new issue with detailed information
3. Include your operating system and Raycast version

### Common Issues

#### Windows

- **Permission Error**: Run Raycast as Administrator
- **Command Not Found**: Ensure Windows networking tools are available

---

**Note**: This extension may require elevated privileges to terminate processes. Make sure to run Raycast with appropriate permissions when using the kill process functionality.
