# LocalStorage Schema & Migration Strategy

This document describes the LocalStorage schema used by the @-profile extension, including versioning and migration strategies.

## Schema Overview

The extension uses three primary LocalStorage keys to store user data:

### 1. `usernameHistory`: `string[]`
Stores a list of previously used usernames for autocomplete and quick access.

- **Type**: Array of strings
- **Max Length**: 20 items (automatically truncated)
- **Order**: Most recently used first
- **Example**: `["johndoe", "jane_smith", "developer123"]`

### 2. `platformSettings`: `PlatformSetting[]`
Stores user preferences for each platform (enabled/disabled state).

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

### 3. `customPlatforms`: `Site[]`
Stores user-defined custom platforms with the same shape as default platforms.

- **Type**: Array of `Site` objects
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

The following constants are defined in `src/sites.ts`:

```typescript
export const STORAGE_KEYS = {
  USERNAME_HISTORY: 'usernameHistory',
  PLATFORM_SETTINGS: 'platformSettings',
  CUSTOM_PLATFORMS: 'customPlatforms'
} as const;
```

## Versioning

**Current Version**: v2

### Version History

- **v1**: Initial version with only `customSites` key
- **v2**: Added `usernameHistory` and `platformSettings`, renamed `customSites` to `customPlatforms`

## Migration Strategy

### v1 → v2 Migration

The migration from v1 to v2 is handled automatically and transparently:

1. **Preserves existing custom platforms**: Data from the legacy `customSites` key is migrated to `customPlatforms`
2. **Automatic migration**: Occurs on first access to custom platforms after upgrade
3. **Clean up**: Legacy key is removed after successful migration
4. **Non-destructive**: If migration fails, original data remains intact

#### Migration Process

```typescript
// Check new key first
let customPlatformsJson = await LocalStorage.getItem<string>(STORAGE_KEYS.CUSTOM_PLATFORMS);

// If not found, try legacy key and migrate
if (!customPlatformsJson) {
  const legacyCustomSitesJson = await LocalStorage.getItem<string>('customSites');
  if (legacyCustomSitesJson) {
    // Migrate from v1 to v2
    await LocalStorage.setItem(STORAGE_KEYS.CUSTOM_PLATFORMS, legacyCustomSitesJson);
    await LocalStorage.removeItem('customSites');
    customPlatformsJson = legacyCustomSitesJson;
  }
}
```

### Future Migration Considerations

- **Backward Compatibility**: Always maintain compatibility with at least one previous version
- **Data Preservation**: Ensure no user data is lost during migrations
- **Versioning Strategy**: Consider adding a schema version key for more complex future migrations
- **Error Handling**: Implement robust error handling and fallback mechanisms
- **Testing**: Thoroughly test migrations with various data states

## API Functions

The following functions are available for interacting with LocalStorage:

### Username History
- `getUsernameHistory(): Promise<string[]>`
- `addToUsernameHistory(username: string): Promise<void>`

### Platform Settings
- `getPlatformSettings(): Promise<PlatformSetting[]>`
- `updatePlatformSettings(settings: PlatformSetting[]): Promise<void>`

### Custom Platforms
- `getCustomPlatforms(): Promise<Site[]>`
- `addCustomPlatform(platform: Site): Promise<void>`
- `removeCustomPlatform(value: string): Promise<void>`

## Best Practices

1. **Always use the provided API functions** rather than directly accessing LocalStorage
2. **Handle JSON parsing errors** gracefully with try-catch blocks
3. **Validate data structure** before storing to prevent corruption
4. **Keep data size reasonable** to avoid performance issues
5. **Test migrations thoroughly** before releasing schema changes
