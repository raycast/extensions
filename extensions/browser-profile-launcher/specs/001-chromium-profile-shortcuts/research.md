# Research: Chromium Browser Profile Shortcuts

**Date**: 2026-03-12
**Branch**: `001-chromium-profile-shortcuts`

## 1. Chromium Profile Directory Locations on macOS

### Decision: Use known filesystem paths per browser

Each Chromium browser stores profiles under `~/Library/Application Support/`
with a browser-specific subdirectory.

| Browser   | Profile Root                                              | App Bundle Path                        |
| --------- | --------------------------------------------------------- | -------------------------------------- |
| Chrome    | `~/Library/Application Support/Google/Chrome/`            | `/Applications/Google Chrome.app`      |
| Edge      | `~/Library/Application Support/Microsoft Edge/`           | `/Applications/Microsoft Edge.app`     |
| Brave     | `~/Library/Application Support/BraveSoftware/Brave-Browser/` | `/Applications/Brave Browser.app`  |
| Arc       | `~/Library/Application Support/Arc/User Data/`            | `/Applications/Arc.app`               |
| Vivaldi   | `~/Library/Application Support/Vivaldi/`                  | `/Applications/Vivaldi.app`           |

**Profile directory naming**: `Default`, `Profile 1`, `Profile 2`, etc.
for all browsers including Arc (Arc also supports standard Chromium
profiles alongside Spaces).

**Rationale**: These are the documented, stable paths. Browser detection
can verify the app bundle exists at the expected path.

**Alternatives considered**:
- Scanning `/Applications/` dynamically: rejected — too broad, would need
  to identify which apps are Chromium-based.
- Using Spotlight (`mdfind`): rejected — slower and unreliable if indexing
  is disabled.

## 2. Profile Metadata Extraction

### Decision: Parse `Local State` for profile list, `Preferences` for per-profile details

**`Local State`** (in profile root, e.g., `~/Library/Application Support/Google/Chrome/Local State`):
- JSON file containing `profile.info_cache` — a map of profile directory
  names to metadata (name, avatar, shortcut_name, gaia_name, etc.).
- This is the single source of truth for the complete profile list.
- Structure: `{ "profile": { "info_cache": { "Default": { "name": "Person 1", "shortcut_name": "Person 1", "gaia_name": "user@gmail.com", "avatar_icon": "chrome://theme/IDR_PROFILE_AVATAR_26" }, "Profile 1": { ... } } } }`

**`Preferences`** (per profile directory):
- JSON file containing `profile.name` for the display name.
- Used as fallback if `Local State` is unavailable.

**Avatar handling**:
- Chromium uses an `avatar_icon` reference like
  `chrome://theme/IDR_PROFILE_AVATAR_N` (index 0-27).
- Custom avatars (from Google account) are stored as
  `Google Profile Picture.png` in the profile directory.
- For the extension: use the Google Profile Picture file if it exists,
  otherwise fall back to a browser-specific default icon.

**Rationale**: `Local State` gives a single-file read for all profiles
rather than iterating directories and opening each `Preferences` file.

**Alternatives considered**:
- Reading each profile's `Preferences` file individually: rejected —
  requires directory enumeration + N file reads vs. 1 file read.
- Reading `profile_metadata.pb` protobuf files: rejected — complex
  parsing for no additional benefit.

## 3. Launching Browsers with Specific Profiles

### Decision: Use `open -a` with `--args --profile-directory`

**Command format**:
```
open -a "Google Chrome" --args --profile-directory="Profile 1"
```

This works for all 5 browsers. The `open` command handles:
- Launching the app if not running.
- Bringing an existing instance to focus if already running.
- The `--profile-directory` flag tells the browser which profile to use.

**Rationale**: Using `open -a` is idiomatic macOS and works within
Raycast's sandbox. Direct binary execution
(`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`) also
works but `open` is simpler and handles app activation natively.

**Alternatives considered**:
- Direct binary execution: works but more verbose, no additional benefit.
- AppleScript `tell application "X" to activate`: doesn't support
  profile selection.

## 4. Window Detection and Show/Hide Toggle

### Decision: Use AppleScript via `osascript` for window manipulation

**Detecting profile windows**:
- Chromium browsers include the profile name in window titles when
  multiple profiles are in use.
- Use AppleScript to enumerate windows of a browser process and match
  by title content.
- Fallback: if only one profile is open, any window of that browser
  belongs to that profile.

**Bringing a window to front**:
```applescript
tell application "System Events"
  tell process "Google Chrome"
    set frontmost to true
    perform action "AXRaise" of window 1 whose name contains "ProfileName"
  end tell
end tell
```

**Minimizing a specific window**:
```applescript
tell application "System Events"
  tell process "Google Chrome"
    set value of attribute "AXMinimized" of (first window whose name contains "ProfileName") to true
  end tell
end tell
```

**Checking if window is frontmost**:
- Check if the browser is the frontmost app AND the target window is
  window 1 (the frontmost window of that app).

**Requirements**:
- macOS Accessibility permissions must be granted to Raycast.
- The extension must detect missing permissions and guide the user.

**Rationale**: AppleScript via `osascript` is the only reliable way to
manipulate individual windows (not whole apps) on macOS. It works from
Node.js via `child_process.exec` or Raycast's `execAsync`.

**Alternatives considered**:
- Hiding the entire app (Cmd+H equivalent): rejected — user explicitly
  chose per-window minimize in clarification.
- Using accessibility APIs directly via native addons: rejected —
  requires compiling native code, violates simplicity principle.
- JXA (JavaScript for Automation): viable alternative to AppleScript
  but less documented for this use case.

## 5. Raycast Extension Architecture

### Decision: Two commands — list view + no-view open command

**Command 1: "Browse Profiles"** (`src/browse-profiles.tsx`, mode: `view`)
- Main searchable list with `List.Section` grouping (Favorites, then
  per-browser sections).
- Action panel: Open, Create Quicklink, Add/Remove Favorite, Refresh.
- Uses `useLocalStorage` hook for favorites reactivity.
- Caches profiles in `LocalStorage` with manual refresh.

**Command 2: "Open Profile"** (`src/open-profile.ts`, mode: `no-view`)
- Receives profile data via `launchContext` from deeplinks/quicklinks.
- Implements the show/hide toggle logic:
  1. Check if profile window exists (AppleScript).
  2. If frontmost → minimize.
  3. If exists but not frontmost → bring to front.
  4. If not running → launch with `open -a`.
- Shows HUD confirmation via `showHUD()`.

**Quicklink creation**:
- Uses `Action.CreateQuicklink` with `createDeeplink()` from
  `@raycast/utils`.
- Deeplink targets "Open Profile" command with `launchContext`
  containing browser name and profile directory.

**Storage keys**:
- `favorite-profiles`: `string[]` of profile unique IDs
  (`browser:profileDir` format, e.g., `chrome:Profile 1`).
- `profiles-cache`: `Profile[]` serialized JSON of discovered profiles.

**Extension preferences** (in `package.json`):
- Per-browser enable/disable checkboxes (default: enabled).

**Rationale**: Separating list view from no-view open command allows
quicklinks to bypass the UI entirely. The `launchContext` approach is
more flexible than command arguments since it doesn't require manifest
declarations.

**Alternatives considered**:
- Single command with conditional UI: rejected — quicklinks need no-view
  mode, but browsing needs view mode. Can't combine.
- Using command arguments instead of launchContext: rejected — arguments
  must be declared in manifest and are limited to text/dropdown types.

## 6. Arc Browser Special Considerations

### Decision: Support Arc with standard Chromium profile detection

Arc uses a "Spaces" model internally, but it still maintains standard
Chromium profile directories (`Default`, `Profile 1`, etc.) under its
Application Support path. The `--profile-directory` flag works for
launching specific profiles.

Arc Spaces are an additional abstraction layer on top of profiles and
are out of scope for this extension. The extension will detect and
launch Arc profiles the same way as other browsers.

**Rationale**: Arc's standard profile mechanism is sufficient for the
extension's needs. Spaces are Arc-specific UI state, not separate
profiles.

**Alternatives considered**:
- Parsing Arc's internal database for Spaces: rejected — fragile,
  undocumented, and violates simplicity principle.
- Excluding Arc entirely: rejected — Arc is popular and its standard
  profiles work fine.
