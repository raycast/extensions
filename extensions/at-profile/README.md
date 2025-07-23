# @ Profile

Quickly visit profiles on social sites with intelligent app management and custom app support.

![@ Profile Extension](metadata/social-profile-1.png)

## Features

### 🚀 Quick Profile Access
- **Open Profile Command**: Quickly search and open profiles across multiple social apps
- Smart app detection and URL generation
- Support for usernames, handles, and profile IDs

### ⚙️ Advanced App Management
- **Manage Apps Command**: Comprehensive app and app management interface
- Enable/disable built-in social apps on the fly
- No need to hardcode dropdown values - apps are dynamically loaded
- Real-time app status updates

### 🎯 Custom App Support
- Add unlimited custom social apps
- Full CRUD operations (Create, Read, Update, Delete) for custom apps
- Flexible URL template system supporting various parameter formats
- Import/Export settings via YAML for easy backup and sharing

### 📦 Built-in App Library
Includes support for major social apps:
- Twitter/X, Instagram, LinkedIn, GitHub, TikTok
- And many more popular social and professional networks

## Usage

### Quick Profile Search
1. Use the "Open Profile" command
2. Select your desired app from the dropdown
3. Enter the username or profile identifier
4. Press Enter to open the profile in your browser

### Managing Apps
1. Use the "Manage Apps" command to access the management interface
2. **Default Social Apps**: Toggle built-in apps on/off
3. **Custom Social Apps**: Add, edit, or remove your custom apps
4. **YAML Settings**: Export/import your configuration for backup or sharing

### Adding Custom Apps
1. In the "Manage Apps" command, select "Add Custom Social App"
2. Fill in the app details:
   - **Name**: Display name for the app
   - **URL Template**: Template with `{username}` placeholder (e.g., `https://example.com/user/{username}`)
3. Save and the app will be immediately available

### YAML Configuration
Export your settings to YAML format for:
- Backing up your custom apps
- Sharing configurations with team members
- Version control of your app settings

## Development

### Architecture
The extension now uses a dynamic app system:
- No hardcoded dropdown values in `package.json`
- App data is managed through `src/apps.ts`
- Custom apps are stored using Raycast's local storage
- App settings (enabled/disabled) are persisted separately

### Adding Built-in Apps
To add new default apps, edit `src/apps.ts`:

```typescript
export const defaultApps: App[] = [
  // ... existing apps
  {
    name: "New App",
    value: "newapp",
    urlTemplate: "https://newapp.com/{username}"
  }
];
```

### File Structure
- `src/quick-open.tsx` - Main profile search interface
- `src/manage-apps.tsx` - App management interface
- `src/custom-app-form.tsx` - Form for adding/editing custom apps
- `src/apps.ts` - Default app definitions and utilities
- `src/yaml-settings.ts` - YAML import/export functionality
- `src/storage.ts` - Local storage utilities
