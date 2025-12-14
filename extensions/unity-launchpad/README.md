# Unity Launchpad

List the unity projects and launch them directly from Raycast.

## Features

- 🎮 Launch Unity projects directly without opening Unity Hub
- 📁 Scan multiple folders for Unity projects
- 🔍 Search and filter projects by name
- ⏰ Shows projects sorted by last modified date
- 📋 Quick access to project folders

## Setup

### Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run in development mode:
   ```bash
   npm run dev
   ```

3. **Configure Extension Preferences:**
   
   In development mode, to set preferences:
   - Open the extension in Raycast
   - Press `Cmd + K` (Or click to bottom-left) to open the action panel
   - Select "Open Extension Preferences" or press `Cmd + ,`
   - Set your "Project Paths" (Check the configuration for more info)
   - Set your "Unity Engine Paths" (Check the configuration for more info)

   If preferences don't open in dev mode, you can manually set them after building:
   ```bash
   npm run build
   ```
   Then install the built extension in Raycast and configure from there.

## Configuration

**Project Paths**: Comma-separated list of folders where your Unity projects are located.

Examples:
- `~/UnityProjects`
- `~/Documents/Projects, ~/Desktop/Unity`
- `/Users/yourname/Development/Unity, ~/Projects`
- `C:\Program Files\Unity\Projects`

**Unity Engine Path**: Comma-separated list of folders where your Unity Engines are located.

Examples:
- `/Applications/Unity/Hub/Editor`
- `C:\Program Files\Unity\Hub\Editor`

## Requirements

- macOS or Windows
- Unity projects with `ProjectSettings/ProjectVersion.txt` file