# Windows Audio Switcher

A professional Raycast extension for Windows that enables seamless switching between audio output and input devices through integration with the AudioDeviceCmdlets PowerShell module.

## Overview

Audio Switcher provides a streamlined interface for managing Windows audio devices directly from Raycast, eliminating the need to navigate through system control panels.

## Key Features

- **Device Management**: Quickly switch between audio playback and recording devices
- **Dual Default Support**: Configure devices as both system default and communication default simultaneously
- **Visual Status Indicators**: Clear identification of current default and communication devices
- **Intelligent Caching**: Optimized performance through device information caching with manual refresh capability
- **Consistent Ordering**: Devices sorted by system index for predictable navigation

## System Requirements

- **Operating System**: Windows 10 or later
- **PowerShell**: Version 5.1 or higher
- **Dependencies**: AudioDeviceCmdlets PowerShell module
- **Platform**: Windows only (not compatible with macOS or Linux)

## Installation

### Automatic Installation

The extension will attempt to install the required AudioDeviceCmdlets module on first launch. This process requires administrator privileges.

### Manual Installation

If automatic installation fails, execute the following commands in PowerShell as Administrator:

```powershell
# Install the AudioDeviceCmdlets module for the current user
Install-Module -Name AudioDeviceCmdlets -Scope CurrentUser
```

### Execution Policy Configuration

If you encounter execution policy restrictions, configure the appropriate policy:

```powershell
# Allow execution of signed remote scripts for the current user
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned
```

## Usage

### Command Reference

| Command | Description | Primary Action |
|---------|-------------|----------------|
| **Output Audio Switcher** | Manage playback devices | Set default output device |
| **Input Audio Switcher** | Manage recording devices | Set default input device |
| **Refresh Audio Devices** | Update device cache | Rescan hardware changes |

### Output Audio Switcher

**Functionality**: Enumerates and manages all audio playback devices.

**Available Actions**:
- Set as Default Output
- Set as Communication Output
- Set as Both (system and communication default)

**Features**:
- Filters display to playback devices only
- Visual indicators for current default and communication devices
- Sorted by system-assigned index

### Input Audio Switcher

**Functionality**: Enumerates and manages all audio recording devices.

**Available Actions**:
- Set as Default Input
- Set as Communication Input
- Set as Both (system and communication default)

**Features**:
- Filters display to recording devices only
- Visual indicators for current default and communication devices
- Sorted by system-assigned index

### Refresh Audio Devices

**Functionality**: Performs a system rescan to detect newly connected or removed audio devices.

**Usage Scenarios**:
- After connecting new audio hardware
- When devices are not appearing in the list
- To synchronize the device cache with system state

**Performance Note**: This operation may take several seconds to complete.

## Technical Architecture

The extension interfaces with Windows audio subsystem through the AudioDeviceCmdlets module:

### Core PowerShell Cmdlets

- `Get-AudioDevice`: Retrieves comprehensive device information and status
- `Set-AudioDevice`: Modifies default device assignments

### Data Flow

1. **Device Discovery**: PowerShell queries Windows audio endpoint manager
2. **Filtering**: Results filtered by device type (Playback/Recording)
3. **Caching**: Device metadata stored in Raycast LocalStorage under the key `audio-devices`
4. **Rendering**: Cached data displayed in Raycast interface for optimal performance
5. **Synchronization**: Refresh command updates cache with current system state

## Troubleshooting

### Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Module installation fails | Insufficient privileges | Run PowerShell as Administrator |
| Execution policy error | Restricted script execution | Configure execution policy as shown in Installation section |
| Devices not appearing | Outdated cache | Execute "Refresh Audio Devices" command |
| Command failures | PowerShell version | Verify PowerShell 5.1+ is installed |

### Debug Information

For detailed error analysis, consult the debug log located at:

```
%USERPROFILE%/.raycast/audio-debug.log
```

## Data Management

### Caching Strategy

Device information is cached in Raycast LocalStorage to optimize performance and reduce system queries. The cache key `audio-devices` stores:

- Device names and identifiers
- System index values
- Default/communication status flags

### Cache Invalidation

The cache automatically updates when:
- The "Refresh Audio Devices" command executes
- Device state changes are detected during command execution

## Platform Compatibility

**Windows**: Fully supported with all features available.

**macOS/Linux**: Not supported. This extension relies on Windows-specific PowerShell modules and audio subsystem APIs that have no direct equivalents on other platforms.

## Support and Contribution

For bug reports, feature requests, or contributions, please submit issues through the official Raycast extension repository.

When reporting issues, include:
- Windows version
- PowerShell version (`$PSVersionTable.PSVersion`)
- Relevant debug log excerpts

## License

This project is licensed under the MIT License. See the LICENSE file for complete terms and conditions.
