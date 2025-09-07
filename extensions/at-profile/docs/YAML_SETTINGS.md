# YAML Settings Import/Export

The @ Profile extension supports importing and exporting settings through YAML files, making it easy to backup your configuration, share settings between devices, or bulk-manage your app preferences.

## Features

- **Export Settings**: Save all your settings (profile history, app preferences, custom apps) to a YAML file
- **Import Settings**: Load settings from a YAML file to restore or sync your configuration
- **Sample YAML**: Generate a template YAML file for reference

## Usage

### Exporting Settings

1. Open the **Manage Apps** command
2. Navigate to the **YAML Settings** section
3. Select **Export Settings to File**
4. Press **Enter** to export
5. The settings will be saved to your home directory with a filename like `at-profile-settings-2024-01-15.yaml`
6. The file path will be copied to your clipboard

### Importing Settings

1. Open the **Manage Apps** command
2. Navigate to the **YAML Settings** section
3. Select **Import Settings from File**
4. Either:
   - Select a `.yaml` file in Finder before running the import, or
   - The system will prompt you to specify a file path
5. Press **Enter** to import
6. Your settings will be updated and the interface will refresh

### Generating Sample YAML

1. Open the **Manage Apps** command
2. Navigate to the **YAML Settings** section
3. Select **Export Settings to File**
4. Choose **Generate Sample YAML**
5. A sample YAML template will be copied to your clipboard

## YAML Structure

The YAML settings file contains the following sections:

```yaml
version: "1.0"
usageHistory:
  - profile: johndoe
    app: github
    appName: GitHub
    timestamp: 1704067200000
  - profile: janedoe
    app: x
    appName: X
    timestamp: 1703980800000
  - profile: example_user
    app: mastodon
    appName: Mastodon
    timestamp: 1703894400000
visible:
  x: true
  instagram: true
  github: true
  linkedin: false
  facebook: false
  reddit: true
  youtube: true
  tiktok: false
  threads: true
  raycast: true
customApps:
  - name: Mastodon
    value: mastodon
    urlTemplate: https://mastodon.social/@{profile}
    visible: true
  - name: Dribbble
    value: dribbble
    urlTemplate: https://dribbble.com/{profile}
    visible: true
```

### Field Descriptions

- **version**: File format version (currently "1.0")
- **usageHistory**: Array of profile usage history with timestamps
- **visible**: Object mapping platform IDs to visible/hidden state
- **customApps**: Array of custom social platforms

#### Usage History Fields

- **profile**: The username/profile that was searched
- **app**: The platform identifier (value) that was used
- **appName**: The display name of the platform
- **timestamp**: Unix timestamp of when the profile was accessed

#### Custom Platform Fields

- **name**: Display name of the platform
- **value**: Unique identifier for the platform
- **urlTemplate**: URL pattern with `{profile}` placeholder
- **visible**: Whether the platform is shown in the dropdown (optional, defaults to true)

## Use Cases

### Backup and Restore

Export your settings before making major changes, then import them to restore if needed.

### Sync Between Devices

Export settings from one device and import them on another to keep your configuration synchronized.

### Team Sharing

Share custom apps and preferred settings with team members.

### Bulk Configuration

Create YAML files programmatically or edit them in a text editor for bulk changes.

## Notes

- Importing settings will merge with existing data (profiles are added to history, platforms are updated)
- Custom apps with duplicate `value` fields may cause conflicts during import
- The export file is saved to your home directory by default
- File selection for import can be done through Finder selection or by specifying a file path

## Troubleshooting

### Import Fails

- Ensure the YAML file is properly formatted
- Check that the `version` field is present
- Verify that custom apps have all required fields (`name`, `value`, `urlTemplate`)

### Export Fails

- Check that you have write permissions to your home directory
- Ensure there's sufficient disk space

### File Not Found

- Make sure the YAML file exists and is accessible
- Try selecting the file in Finder before running the import command
