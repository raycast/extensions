# Prusa Printer Control for Raycast

Control your Prusa printer directly from Raycast. Monitor print status, manage files, and control prints without leaving your keyboard.

## Features

- 🖨️ **Live Printer Status**
  - Temperature monitoring (nozzle and bed)
  - Print progress tracking
  - Current state and controls
- 📁 **File Management**
  - Browse and search print files
  - Start prints directly
  - Delete files
- 🎛️ **Print Controls**
  - Pause/Resume prints
  - Cancel ongoing prints
  - Monitor progress

## Setup

1. Install the extension from Raycast Store
2. Configure your printer:
   - Get your printer's IP address (e.g., 192.168.1.100)
   - Get your PrusaLink API key from the printer's web interface
3. Enter these details in the extension preferences

## Usage

### View Printer Status
1. Open Raycast
2. Type "Printer Status"
3. View live printer information and controls

### Manage Files
1. Open Raycast
2. Type "Print Files"
3. Browse, search, or manage your print files

## Troubleshooting

- **Can't Connect**: Verify your printer's IP address and ensure you're on the same network
- **Authentication Failed**: Check your API key in preferences
- **Slow Response**: Adjust the request timeout in preferences
- **Print Not Starting**: Ensure printer is idle and ready

## Supported Printers

- Prusa XL (built-in PrusaLink)
- Prusa MK4 (built-in PrusaLink)
- Prusa MINI+ (built-in PrusaLink)
- Prusa MK3S+ (via Raspberry Pi running PrusaLink)

## Support

- GitHub Issues: https://github.com/raycast/extensions/issues
- Raycast Discord: https://raycast.com/community