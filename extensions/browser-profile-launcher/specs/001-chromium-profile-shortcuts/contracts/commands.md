# Command Contracts: Chromium Browser Profile Shortcuts

**Date**: 2026-03-12
**Branch**: `001-chromium-profile-shortcuts`

## Extension Manifest Commands

The extension exposes two commands to Raycast.

### Command: Browse Profiles

| Field         | Value                                                  |
| ------------- | ------------------------------------------------------ |
| `name`        | `browse-profiles`                                      |
| `title`       | `Browse Profiles`                                      |
| `description` | `Browse and open browser profiles from all Chromium browsers` |
| `mode`        | `view`                                                 |

**Behavior**: Opens a searchable `List` view with all discovered profiles
grouped by browser. Favorites appear in a dedicated top section.

**Action Panel**:

| Action              | Shortcut   | Description                                    |
| ------------------- | ---------- | ---------------------------------------------- |
| Open Profile        | `Enter`    | Launch or toggle the selected profile          |
| Create Quicklink    | `⌘+L`     | Create a Raycast quicklink for the profile     |
| Add to Favorites    | `⌘+F`     | Toggle favorite status for the profile         |
| Refresh Profiles    | `⌘+R`     | Re-scan filesystem and update the profile list |

---

### Command: Open Profile

| Field         | Value                                                  |
| ------------- | ------------------------------------------------------ |
| `name`        | `open-profile`                                         |
| `title`       | `Open Profile`                                         |
| `description` | `Open a specific browser profile (used by quicklinks)` |
| `mode`        | `no-view`                                              |

**Launch Context** (received via deeplink):

```typescript
interface OpenProfileContext {
  browserId: string;       // e.g., "chrome"
  profileDirectory: string; // e.g., "Profile 1"
  displayName: string;      // e.g., "Work"
}
```

**Behavior** (toggle logic):
1. Check if a window for `browserId` + `profileDirectory` is open.
2. If open and frontmost → minimize that window.
3. If open but not frontmost → bring that window to front.
4. If not open → launch browser with `--profile-directory` flag.
5. Show HUD: `"Opened {displayName} — {browserName}"` or
   `"Minimized {displayName} — {browserName}"`.

**Error handling**:
- If browser not installed → show HUD error:
  `"{browserName} is not installed"`.
- If profile directory missing → show HUD error:
  `"Profile not found. Try refreshing profiles."`.
- If Accessibility permissions missing → show HUD error:
  `"Accessibility permission required for show/hide. Grant in System Settings."`.

---

## Extension Preferences

Defined at extension level in `package.json`.

| Name            | Type       | Title            | Default |
| --------------- | ---------- | ---------------- | ------- |
| `enableChrome`  | `checkbox` | Google Chrome    | `true`  |
| `enableEdge`    | `checkbox` | Microsoft Edge   | `true`  |
| `enableBrave`   | `checkbox` | Brave Browser    | `true`  |
| `enableArc`     | `checkbox` | Arc              | `true`  |
| `enableVivaldi` | `checkbox` | Vivaldi          | `true`  |

---

## Deeplink Contract

Quicklinks created by the extension use this deeplink format:

```
raycast://extensions/{author}/{extensionName}/open-profile?context={encodedJSON}
```

Where `context` is a URL-encoded JSON object matching `OpenProfileContext`.

Generated via:
```typescript
createDeeplink({
  command: "open-profile",
  context: {
    browserId: "chrome",
    profileDirectory: "Profile 1",
    displayName: "Work"
  }
})
```

---

## Storage Contracts

| Key                  | Type       | Schema                                    |
| -------------------- | ---------- | ----------------------------------------- |
| `profiles-cache`     | `string`   | JSON: `{ profiles: Profile[], scannedAt: string }` |
| `favorite-profiles`  | `string`   | JSON: `string[]` (array of Profile.id)    |
