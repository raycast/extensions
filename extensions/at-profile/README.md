# @ Profile

Quickly visit profiles on social sites with intelligent platform management and custom app support.

![@ Profile Extension](metadata/social-profile-1.png)

## Features

### 🚀 Quick Profile Access
- **Open Profile Command**: Quickly search and open profiles across multiple social platforms
- Smart platform detection and URL generation
- Support for usernames, handles, and profile IDs

### ⚙️ Advanced App Management
- **Manage Apps Command**: Comprehensive platform and app management interface
- Enable/disable built-in social platforms on the fly
- No need to hardcode dropdown values - platforms are dynamically loaded
- Real-time platform status updates

### 🎯 Custom Platform Support
- Add unlimited custom social platforms and apps
- Full CRUD operations (Create, Read, Update, Delete) for custom platforms
- Flexible URL template system supporting various parameter formats
- Import/Export settings via YAML for easy backup and sharing

### 📦 Built-in Platform Library
Includes support for major social platforms:
- Twitter/X, Instagram, LinkedIn, GitHub, TikTok
- And many more popular social and professional networks

## Usage

### Quick Profile Search
1. Use the "Open Profile" command
2. Select your desired platform from the dropdown
3. Enter the username or profile identifier
4. Press Enter to open the profile in your browser

### Managing Apps & Platforms
1. Use the "Manage Apps" command to access the management interface
2. **Default Social Apps**: Toggle built-in platforms on/off
3. **Custom Social Apps**: Add, edit, or remove your custom platforms
4. **YAML Settings**: Export/import your configuration for backup or sharing

### Adding Custom Platforms
1. In the "Manage Apps" command, select "Add Custom Social App"
2. Fill in the platform details:
   - **Name**: Display name for the platform
   - **URL Template**: Template with `{username}` placeholder (e.g., `https://example.com/user/{username}`)
3. Save and the platform will be immediately available

### YAML Configuration
Export your settings to YAML format for:
- Backing up your custom platforms
- Sharing configurations with team members
- Version control of your platform settings

## Development

### Architecture
The extension now uses a dynamic platform system:
- No hardcoded dropdown values in `package.json`
- Platform data is managed through `src/sites.ts`
- Custom platforms are stored using Raycast's local storage
- Platform settings (enabled/disabled) are persisted separately

### Adding Built-in Platforms
To add new default platforms, edit `src/sites.ts`:

```typescript
export const defaultSites: SocialSite[] = [
  // ... existing platforms
  {
    name: "New Platform",
    value: "newplatform",
    urlTemplate: "https://newplatform.com/{username}"
  }
];
```

### File Structure
- `src/quick-open.tsx` - Main profile search interface
- `src/manage-apps.tsx` - Platform management interface
- `src/custom-platform-form.tsx` - Form for adding/editing custom platforms
- `src/sites.ts` - Default platform definitions and utilities
- `src/yaml-settings.ts` - YAML import/export functionality
- `src/storage.ts` - Local storage utilities
