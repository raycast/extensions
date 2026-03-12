# Data Model: Chromium Browser Profile Shortcuts

**Date**: 2026-03-12
**Branch**: `001-chromium-profile-shortcuts`

## Entities

### Browser

Represents a supported Chromium-based browser installed on the system.

| Field              | Type     | Description                                        |
| ------------------ | -------- | -------------------------------------------------- |
| `id`               | `string` | Unique key (e.g., `"chrome"`, `"edge"`, `"brave"`) |
| `name`             | `string` | Display name (e.g., `"Google Chrome"`)             |
| `bundleId`         | `string` | macOS bundle ID (e.g., `"com.google.Chrome"`)      |
| `applicationPath`  | `string` | Path to `.app` bundle in `/Applications/`          |
| `profileRootPath`  | `string` | Path under `~/Library/Application Support/`        |
| `icon`             | `string` | Path to browser icon asset in `assets/`            |
| `processName`      | `string` | Process name in System Events (e.g., `"Google Chrome"`) |

**Identity**: `id` (static, defined in code)
**Lifecycle**: Static — defined as a constant registry in the codebase.
Not persisted to storage.

**Supported values**:

| id        | name              | profileRootPath                                       |
| --------- | ----------------- | ----------------------------------------------------- |
| `chrome`  | Google Chrome     | `~/Library/Application Support/Google/Chrome/`        |
| `edge`    | Microsoft Edge    | `~/Library/Application Support/Microsoft Edge/`       |
| `brave`   | Brave Browser     | `~/Library/Application Support/BraveSoftware/Brave-Browser/` |
| `arc`     | Arc               | `~/Library/Application Support/Arc/User Data/`        |
| `vivaldi` | Vivaldi           | `~/Library/Application Support/Vivaldi/`              |

---

### Profile

Represents a user profile within a specific browser.

| Field              | Type              | Description                                          |
| ------------------ | ----------------- | ---------------------------------------------------- |
| `id`               | `string`          | Unique key: `"{browserId}:{directoryName}"`          |
| `browserId`        | `string`          | Foreign key to `Browser.id`                          |
| `directoryName`    | `string`          | Profile directory name (e.g., `"Default"`, `"Profile 1"`) |
| `displayName`      | `string`          | Human-readable name from metadata                    |
| `avatarPath`       | `string \| null`  | Absolute path to avatar image file, or null          |
| `gaiaName`         | `string \| null`  | Google account name if signed in, or null            |

**Identity**: `id` — composite of `browserId` + `directoryName`
(e.g., `"chrome:Profile 1"`).

**Lifecycle**:
- Created when scanning browser profile directories.
- Cached in `LocalStorage` under key `profiles-cache`.
- Refreshed on manual "Refresh Profiles" action.
- Deleted from cache when browser is uninstalled or profile removed
  (detected on next refresh).

**Validation rules**:
- `directoryName` must match a directory under the browser's
  `profileRootPath`.
- `displayName` extracted from `Local State` → `profile.info_cache`
  → `[directoryName].name`. Fallback: `directoryName` itself.
- `avatarPath` must point to an existing file
  (`Google Profile Picture.png` in profile dir). If missing, null.

---

### FavoriteSet

The set of profile IDs the user has marked as favorites.

| Field          | Type       | Description                              |
| -------------- | ---------- | ---------------------------------------- |
| `profileIds`   | `string[]` | Array of `Profile.id` values             |

**Storage**: `LocalStorage` key `favorite-profiles`.
Serialized as JSON string array.

**Lifecycle**:
- Empty initially.
- Profiles added/removed via action panel toggle.
- If a cached profile ID no longer exists after refresh, it remains
  in favorites (harmless — profile simply won't appear in the list).

---

### ProfileCache

The cached result of the last profile scan.

| Field          | Type        | Description                              |
| -------------- | ----------- | ---------------------------------------- |
| `profiles`     | `Profile[]` | All discovered profiles                  |
| `scannedAt`    | `string`    | ISO timestamp of last scan               |

**Storage**: `LocalStorage` key `profiles-cache`.
Serialized as JSON.

**Lifecycle**:
- Populated on first command open (if cache is empty).
- Refreshed only via explicit "Refresh Profiles" action.
- Cleared if extension is uninstalled.

## Relationships

```
Browser (1) ──── (0..N) Profile
Profile (0..N) ──── (0..N) FavoriteSet  (via profileIds array)
ProfileCache (1) ──── (0..N) Profile
```

- A Browser has zero or more Profiles (zero if no profiles or browser
  not installed).
- A Profile belongs to exactly one Browser.
- A Profile can optionally be in the FavoriteSet.
- ProfileCache holds all Profiles across all enabled browsers.
