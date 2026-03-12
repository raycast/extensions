# Quickstart: Chromium Browser Profile Shortcuts

**Date**: 2026-03-12
**Branch**: `001-chromium-profile-shortcuts`

## Prerequisites

- macOS (Raycast requirement)
- [Raycast](https://raycast.com/) installed
- At least one Chromium-based browser installed (Chrome, Edge, Brave,
  Arc, or Vivaldi)
- Node.js 18+ (for Raycast extension development)

## Setup

1. Clone the repository and install dependencies:
   ```bash
   git clone <repo-url>
   cd raycast-browser-profile-launcher
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```
   This runs `ray develop` which loads the extension into Raycast.

3. **Grant Accessibility permissions** (required for show/hide toggle):
   - Open System Settings → Privacy & Security → Accessibility
   - Add and enable Raycast
   - Without this, the show/hide toggle will still launch profiles but
     cannot detect or manipulate individual windows

## Usage

### Browse Profiles

1. Open Raycast (`⌘+Space` or your configured hotkey).
2. Type "Browse Profiles" and press Enter.
3. The list shows all profiles from all installed Chromium browsers.
4. Use the search bar to filter by profile name or browser.
5. Press Enter on a profile to open it.

### Create a Quicklink (Keyboard Shortcut)

1. From the profile list, navigate to the profile you want.
2. Press `⌘+L` (or select "Create Quicklink" from the action panel).
3. Raycast creates a quicklink for that profile.
4. To assign a hotkey: Raycast Settings → Extensions → Quicklinks →
   find the quicklink → assign a hotkey.
5. Now pressing that hotkey will instantly open/toggle that profile.

### Toggle Show/Hide

Once a profile has a quicklink with a hotkey:
- Press the hotkey when the profile is **not visible** → brings it to
  the front.
- Press the hotkey when the profile **is the frontmost window** →
  minimizes that window.
- Press the hotkey when the profile is **not running** → launches it.

### Manage Favorites

1. From the profile list, press `⌘+F` on any profile to toggle its
   favorite status.
2. Favorites appear in a dedicated "Favorites" section at the top.

### Configure Browser Sources

1. Open Raycast Settings → Extensions → Browser Profile Shortcuts.
2. Toggle checkboxes to enable/disable specific browsers.
3. Disabled browsers' profiles will not appear in the list.

### Refresh Profiles

If you've created, renamed, or deleted a browser profile:
1. Open "Browse Profiles".
2. Press `⌘+R` (or select "Refresh Profiles" from the action panel).
3. The list re-scans all browser profile directories.

## Verification Checklist

After setup, verify these work:

- [ ] "Browse Profiles" command appears in Raycast
- [ ] Profiles from installed browsers are listed
- [ ] Selecting a profile opens the correct browser with that profile
- [ ] Creating a quicklink succeeds and appears in Raycast quicklinks
- [ ] Favorites persist across command reopens
- [ ] "Refresh Profiles" detects newly created profiles
- [ ] Show/hide toggle works (requires Accessibility permission)

## Troubleshooting

| Symptom                           | Solution                                      |
| --------------------------------- | --------------------------------------------- |
| No profiles found                 | Check that a supported browser is installed   |
| Profiles missing after update     | Press `⌘+R` to refresh the profile list       |
| Show/hide not working             | Grant Raycast Accessibility permission         |
| Wrong profile opens               | Refresh profiles — cache may be stale          |
| Extension won't build             | Run `npm install` then `ray build`             |
