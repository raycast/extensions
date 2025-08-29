# LocalStorage Schema & Migration Strategy

This document describes the LocalStorage schema used by the @-profile extension, including versioning and migration strategies.

## Schema Overview

The extension uses three primary LocalStorage keys to store user data:

### 1. `profileHistory`: `string[]`

Stores a list of previously used profiles for autocomplete and quick access.

- **Type**: Array of strings
- **Max Length**: 20 items (automatically truncated)
- **Order**: Most recently used first
- **Example**: `["johndoe", "jane_smith", "developer123"]`

### 2. `appSettings`: `AppSetting[]`

Stores user preferences for each app (enabled/disabled state).

- **Type**: Array of objects with `{ value: string; enabled: boolean }`
- **Purpose**: Allows users to enable/disable specific platforms
- **Example**:

  ```json
  [
    { "value": "github", "enabled": true },
    { "value": "twitter", "enabled": false },
    { "value": "linkedin", "enabled": true }
  ]
  ```

### 3. `customApps`: `App[]`

Stores user-defined custom apps with the same shape as default platforms.

- **Type**: Array of `App` objects
- **Schema**: `{ name: string; value: string; urlTemplate: string }`
- **Purpose**: Allows users to add custom social platforms
- **Example**:

  ```json
  [
    {
      "name": "My Blog",
      "value": "myblog",
      "urlTemplate": "https://myblog.com/author/{profile}"
    }
  ]
  ```

## Storage Key Constants

The following constants are defined in `src/apps.ts`:

```typescript
export const STORAGE_KEYS = {
  PROFILE_HISTORY: 'profileHistory',
  APP_SETTINGS: 'appSettings',
  CUSTOM_APPS: 'customApps'
} as const;
```

## Versioning

**Current Version**: v2

### Version History

- **v1**: Initial version with only `customApps` key
- **v2**: Added `profileHistory` and `appSettings`, improved custom app storage and handling

## API Functions

The following functions are available for interacting with LocalStorage:

### Profile History

- `getProfileHistory(): Promise<string[]>`
- `addToProfileHistory(profile: string): Promise<void>`

### App Settings

- `getAppSettings(): Promise<AppSetting[]>`
- `updateAppSettings(settings: AppSetting[]): Promise<void>`

### Custom Apps

- `getCustomApps(): Promise<App[]>`
- `addCustomApp(app: App): Promise<void>`
- `removeCustomApp(value: string): Promise<void>`

## Best Practices

1. **Always use the provided API functions** rather than directly accessing LocalStorage
2. **Handle JSON parsing errors** gracefully with try-catch blocks
3. **Validate data structure** before storing to prevent corruption
4. **Keep data size reasonable** to avoid performance issues
