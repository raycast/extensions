# DS4 Raycast Extension

A Raycast extension to quickly launch DS4Windows application.

## Features

- Launch DS4Windows.exe from a custom directory
- Uses DS4_PATH environment variable for flexible installation paths
- Quick access through Raycast command palette
- Toast notifications for success/error feedback

## Setup

1. Set the DS4_PATH environment variable to point to your DS4Windows installation directory:
   ```bash
   # Windows (PowerShell)
   $env:DS4_PATH = "C:\Path\To\Your\DS4Windows\Directory"
   
   # Or set it permanently in System Environment Variables
   ```

2. Make sure DS4Windows.exe exists in the specified directory

## Development

To run this extension in development mode:

```bash
npm install
npm run dev
```

## Building

To build the extension:

```bash
npm run build
```

## Publishing

To publish to the Raycast Store:

```bash
npm run publish
```

## Usage

1. Install the extension in Raycast
2. Open Raycast (⌘ + Space)
3. Type "Launch DS4Windows" or "DS4" to find the command
4. Press Enter to execute

The extension will launch DS4Windows from the directory specified in your DS4_PATH environment variable.