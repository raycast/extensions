# Localhost Manager for Raycast

A powerful Raycast extension to manage and monitor all listening ports and processes on your macOS system, including Docker containers.

## Features

### 🔍 **Process Monitoring**
- View all TCP and UDP listening ports on your system
- Real-time monitoring with automatic refresh every 4 seconds
- Display process names, PIDs, users, and resource usage (CPU & Memory)
- Identify which application is using which port

### 🎛️ **View Modes**

#### **Simple View** (Default)
Provides a clean, minimal interface showing:
- Port number (e.g., `:1800`)
- Protocol and application name
- Process ID (PID)
- User running the process
- CPU usage percentage

#### **Advanced View**
Detailed view with additional information:
- Full address and port in subtitle (e.g., `127.0.0.1:1800`)
- Protocol type badge
- Application name
- Process ID and User ID
- CPU and Memory usage
- Detailed metadata panel on the right showing:
  - Executable path
  - Working directory
  - Process start time
  - Full command line arguments

### 🎯 **Filtering Options**

Access filtering options via the dropdown menu:

1. **Show everything** - Display all processes (default)
2. **Hide system processes** - Filter out system processes (UID < 500 or system paths)
3. **Hide 0% CPU badges** - Hide CPU usage badges when usage is 0%
4. **Hide system + 0% CPU** - Combine both filters above

### 🐳 **Docker Integration**
- Automatically detects Docker installation
- Lists all running containers with:
  - Container name and image
  - Port mappings
  - CPU and Memory usage
  - Container status

### ⚡ **Quick Actions**

For each listening port, you can:

#### **Primary Actions**
- **Open in Browser** (`↵`) - Open http://localhost:port in your default browser
- **Copy address** - Copy the host:port combination to clipboard
- **Copy PID** - Copy the process ID
- **Copy command** - Copy the full command/executable path

#### **File Actions**
- **Reveal app in Finder** - Show the executable in Finder (when available)
- **Open working folder** - Open the process's working directory

#### **Process Control**
- **Stop nicely** (`⌘ + ⌫`) - Send SIGTERM to gracefully stop the process
- **Force stop** (`⌘ + ⇧ + ⌫`) - Send SIGKILL to forcefully terminate the process
- **Stop by port** - Terminate all processes listening on a specific port

#### **Docker Actions**
- **Start Container** - Start a stopped container
- **Stop Container** - Stop a running container
- **Restart Container** - Restart a container

### ⌨️ **Keyboard Shortcuts**

- `↵` - Open localhost URL in browser
- `⌘ + ⌫` - Stop process gracefully (SIGTERM)
- `⌘ + ⇧ + ⌫` - Force kill process (SIGKILL)
- `⌘ + K` - Show all available actions
- `⌘ + R` - Refresh the list manually

### 🔄 **Auto-refresh**
The extension automatically refreshes every 4 seconds to keep the information up-to-date, showing real-time CPU and memory usage.

## Installation

```bash
npm install
npm run build
```

## Development

```bash
npm run dev
```

## Requirements

- macOS (uses system utilities like `lsof`, `ps`, and `kill`)
- Node.js 20.8.1 or later
- Raycast

## Technical Details

### System Integration
The extension uses hardcoded paths to macOS system binaries for security:
- `/usr/sbin/lsof` - List open files and network connections
- `/bin/ps` - Get process information
- `/bin/kill` - Send signals to processes

### Docker Support
Automatically detects Docker in common installation paths:
- `/usr/local/bin/docker`
- `/opt/homebrew/bin/docker`
- `/usr/bin/docker`

### Process Name Resolution
The extension intelligently resolves full application names from abbreviated process names returned by system utilities, ensuring you see "Spotify" instead of "Sp", "Google Chrome" instead of "Go", etc.

## Troubleshooting

### Processes showing abbreviated names
The extension automatically maps common abbreviated names to their full application names. If you see an unfamiliar abbreviation, it's likely a system process.

### Docker containers not showing
Ensure Docker Desktop is running and the Docker daemon is accessible. The extension will show "Docker not available" if it cannot connect to Docker.

### Some processes not visible
System processes can be hidden using the "Hide system processes" filter option. These include processes running under system users or from system directories.

## Privacy & Security

This extension only reads system information and does not transmit any data externally. All operations are performed locally on your machine using standard macOS utilities.

## License

MIT