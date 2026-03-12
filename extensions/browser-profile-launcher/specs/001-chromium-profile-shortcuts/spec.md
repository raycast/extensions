# Feature Specification: Chromium Browser Profile Shortcuts

**Feature Branch**: `001-chromium-profile-shortcuts`
**Created**: 2026-03-12
**Status**: Draft
**Input**: User description: "Spec out a fully featured extension that fetches all profiles from all chromium based browsers installed on the mac and lets you create a command to open a particular profile. You should also be able to assign shortcuts to these profiles so that you can show/hide them easily like you deal with an application."

## Clarifications

### Session 2026-03-12

- Q: Should show/hide affect only the targeted profile's window or the entire browser app? → A: Minimize only the targeted profile's window; other profile windows stay visible.
- Q: Should additional Chromium forks beyond the core 5 be included in the initial release? → A: Core 5 only (Chrome, Edge, Brave, Arc, Vivaldi). Additional browsers can be added later via the provider architecture.
- Q: How should the extension handle profile data freshness? → A: Cache profiles with a manual "Refresh Profiles" action in the action panel.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Browse and Open Any Profile (Priority: P1)

A user opens Raycast and launches the "Browse Profiles" command. They see a
searchable list of every profile from every Chromium-based browser installed
on their Mac (Chrome, Edge, Brave, Arc, Vivaldi, etc.). Each item shows the
profile name, the browser it belongs to, and the profile's avatar. The user
selects a profile and presses Enter to open that browser with that specific
profile. If the profile is already running, the existing window is brought
to the front instead of launching a duplicate.

**Why this priority**: Without profile discovery and launching, no other
feature (shortcuts, show/hide) has anything to act on. This is the
foundational capability.

**Independent Test**: Install the extension on a Mac with at least two
Chromium browsers, each having multiple profiles. Open the command, verify
all profiles appear, select one, and confirm the correct browser opens with
the correct profile.

**Acceptance Scenarios**:

1. **Given** Chrome and Brave are installed with 2 profiles each,
   **When** the user opens "Browse Profiles",
   **Then** they see 4 items grouped by browser with profile names, browser
   names, and profile avatars.

2. **Given** the profile list is showing,
   **When** the user types a search query,
   **Then** the list filters by profile name and browser name in real time.

3. **Given** a profile's browser window is not open,
   **When** the user selects that profile and presses Enter,
   **Then** the browser launches with that profile and Raycast closes.

4. **Given** a profile's browser window is already open,
   **When** the user selects that profile and presses Enter,
   **Then** the existing window is brought to the front (no duplicate launch).

5. **Given** a browser is installed but has no additional profiles,
   **When** the user opens "Browse Profiles",
   **Then** the default profile still appears in the list with a clear label
   (e.g., "Default" or "Person 1").

6. **Given** the user has created a new browser profile since the last scan,
   **When** they select "Refresh Profiles" from the action panel,
   **Then** the list updates to include the new profile without closing the
   command.

---

### User Story 2 - Create Quicklink Shortcuts for Profiles (Priority: P2)

A user finds a profile they use frequently and wants instant access to it.
From the profile list, they choose "Create Quicklink" from the action panel.
Raycast creates a quicklink for that profile. The user can then assign a
global hotkey to this quicklink through Raycast's built-in hotkey settings,
giving them one-keystroke access to their favorite profile — just like
launching an application.

**Why this priority**: This is the core differentiator — turning profiles
into first-class launchable items with dedicated shortcuts. Depends on P1
for profile discovery.

**Independent Test**: Create a quicklink for a profile, assign a hotkey in
Raycast settings, press the hotkey, and confirm the correct profile opens.

**Acceptance Scenarios**:

1. **Given** the user is viewing a profile in the list,
   **When** they press the "Create Quicklink" action,
   **Then** a Raycast quicklink is created with a descriptive name
   (e.g., "Open Work — Chrome") and the user sees a confirmation.

2. **Given** a quicklink exists for a profile,
   **When** the user assigns a hotkey to it via Raycast preferences and
   presses that hotkey,
   **Then** the associated profile opens (or comes to front if already open).

3. **Given** a quicklink already exists for a profile,
   **When** the user tries to create another quicklink for the same profile,
   **Then** the system informs them a quicklink already exists and offers to
   open Raycast preferences to manage it.

---

### User Story 3 - Toggle Profile Visibility (Show/Hide) (Priority: P3)

A power user has multiple browser profiles running simultaneously and wants
to toggle their visibility like they would with applications. When they
trigger a profile (via quicklink hotkey or the profile list), the extension
checks whether that profile's window is currently frontmost. If it is, the
browser is hidden. If it is not frontmost (or is hidden), the profile's
window is brought to the front. This mirrors the show/hide behavior of
macOS application switching.

**Why this priority**: This elevates the extension from a launcher to a
profile-level window manager. It builds on P1 (detection) and P2
(shortcuts) to deliver the "treat profiles like apps" experience.

**Independent Test**: Open a profile via the extension, switch to another
app, trigger the same profile again, and verify it comes to the front.
Trigger it once more while it is frontmost and verify it hides.

**Acceptance Scenarios**:

1. **Given** a profile's browser window is open but not frontmost,
   **When** the user triggers that profile,
   **Then** the window is brought to the front and focused.

2. **Given** a profile's browser window is frontmost,
   **When** the user triggers that profile again,
   **Then** only that profile's window is minimized (other browser windows
   for different profiles remain visible and unaffected).

3. **Given** a profile's browser window is not open at all,
   **When** the user triggers that profile,
   **Then** the browser launches with that profile (same as P1 open
   behavior).

4. **Given** the browser has multiple profile windows open,
   **When** the user triggers a specific profile,
   **Then** only that profile's window is affected — other profile windows
   remain in their current state.

---

### User Story 4 - Manage Favorite Profiles (Priority: P4)

A user has many profiles across several browsers but only regularly uses a
few. They want to mark profiles as favorites so these appear at the top of
the list. From the profile list, they select "Add to Favorites" from the
action panel. Favorites appear in a dedicated section above other profiles
for quick access.

**Why this priority**: Quality-of-life enhancement that reduces friction
for users with many profiles. Fully optional and builds on the P1 list.

**Independent Test**: Mark two profiles as favorites, reopen the command,
and confirm they appear in a "Favorites" section at the top of the list.

**Acceptance Scenarios**:

1. **Given** a user has 8 profiles across 3 browsers,
   **When** they mark 2 profiles as favorites,
   **Then** those 2 appear in a "Favorites" section at the top of the list,
   with the remaining 6 below in an "All Profiles" section.

2. **Given** a profile is marked as a favorite,
   **When** the user selects "Remove from Favorites",
   **Then** the profile moves back to the general list.

3. **Given** favorites are set,
   **When** the user reopens the command in a new Raycast session,
   **Then** favorites persist and appear at the top.

---

### User Story 5 - Configure Browser Sources (Priority: P5)

A user has several Chromium browsers installed but only wants to see
profiles from Chrome and Brave. They open the extension preferences and
deselect browsers they do not want to scan. The profile list updates to
show only profiles from selected browsers.

**Why this priority**: Useful for users with many browsers where some are
rarely used. Purely a filtering/preference feature.

**Independent Test**: Disable a browser in preferences, reopen the profile
list, and confirm profiles from that browser no longer appear.

**Acceptance Scenarios**:

1. **Given** Chrome, Edge, and Brave are installed,
   **When** the user disables Edge in extension preferences,
   **Then** only Chrome and Brave profiles appear in the list.

2. **Given** all browsers are disabled,
   **When** the user opens the profile list,
   **Then** an empty state message guides them to enable at least one
   browser in preferences.

3. **Given** a new Chromium browser is installed after the extension,
   **When** the user opens the profile list,
   **Then** the new browser's profiles are automatically detected (browser
   is enabled by default).

---

### Edge Cases

- **No Chromium browsers installed**: Show an informative empty state
  explaining that no supported browsers were found, with a list of
  supported browsers.
- **Browser installed but profile directory is inaccessible**: Show the
  browser in the list with a warning icon and a message explaining the
  profiles could not be read (e.g., permissions issue).
- **Profile directory exists but is corrupt or empty**: Skip the profile
  gracefully and log a warning; do not crash or show a broken entry.
- **Browser is updated and profile directory structure changes**: The
  extension should handle missing expected files gracefully and surface a
  clear error rather than crashing.
- **Profile name contains special characters or is very long**: Display
  names must be truncated or sanitized for the Raycast UI without losing
  identifiability.
- **Multiple browser windows open for the same profile**: The toggle
  (show/hide) behavior should affect the most recently active window for
  that profile.
- **Browser is a Chromium fork with a non-standard profile directory
  location**: The extension supports known browsers only; adding new
  browsers is a separate concern handled by the provider architecture.
- **Cached profile no longer exists on disk**: If a user opens a cached
  profile that has since been deleted, the extension should show an error
  and suggest refreshing the profile list.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The extension MUST auto-detect all Chromium-based browsers
  installed on the user's Mac by scanning known installation paths.
- **FR-002**: The extension MUST read and parse profile directories for each
  detected browser to extract profile names, avatars, and identifiers.
- **FR-003**: The extension MUST display all discovered profiles in a
  searchable, grouped list (grouped by browser).
- **FR-004**: The extension MUST launch the correct browser with the correct
  profile flag when a user opens a profile.
- **FR-005**: The extension MUST detect whether a profile's browser window
  is already running and bring it to the front instead of launching a
  duplicate.
- **FR-006**: The extension MUST allow users to create Raycast quicklinks
  for any profile, enabling hotkey assignment through Raycast's native
  preferences.
- **FR-007**: The extension MUST support a toggle (show/hide) behavior:
  if the profile's window is frontmost, minimize that specific window
  (leaving other browser windows unaffected); if not frontmost or
  minimized, bring it to front; if not running, launch it.
- **FR-008**: The extension MUST persist favorite profiles across sessions
  and display them in a dedicated section at the top of the list.
- **FR-009**: The extension MUST allow users to enable or disable specific
  browsers via extension preferences.
- **FR-010**: The extension MUST gracefully handle missing, inaccessible,
  or corrupt profile directories with user-friendly messages.
- **FR-011**: The extension MUST display the profile's avatar/icon when
  available, falling back to a default icon per browser.
- **FR-012**: The extension MUST support exactly these 5 browsers in the
  initial release: Google Chrome, Microsoft Edge, Brave, Arc, and Vivaldi.
  Additional Chromium forks (Opera, Sidekick, etc.) are out of scope for
  the initial release but can be added later via the provider architecture.
- **FR-013**: The extension MUST cache discovered profiles for performance
  and provide a "Refresh Profiles" action in the action panel that
  re-scans the filesystem and updates the list in place.

### Key Entities

- **Browser**: A Chromium-based application installed on the Mac. Attributes
  include name, icon, installation path, profile directory path, and
  command-line profile flag format.
- **Profile**: A user profile within a browser. Attributes include display
  name, avatar image path, directory name (e.g., "Profile 1"), associated
  browser, and a unique identifier (browser + directory name).
- **Favorite**: A user-designated profile that appears in the prioritized
  section. Stored as a reference to a profile's unique identifier.
- **Quicklink**: A Raycast quicklink created for a specific profile,
  enabling hotkey assignment. Contains the profile identifier and a
  descriptive name.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can discover and open any profile from any supported
  installed Chromium browser within 3 interactions (open command, optional
  search, select profile).
- **SC-002**: Profile list loads and displays within 1 second of opening
  the command, even with 5+ browsers and 20+ total profiles.
- **SC-003**: A profile opens (browser launch or window activation) within
  500ms of user selection.
- **SC-004**: Users can create a quicklink for any profile in a single
  action from the profile list.
- **SC-005**: The show/hide toggle correctly identifies window state and
  performs the appropriate action (show, hide, or launch) 100% of the
  time for single-window-per-profile scenarios.
- **SC-006**: Favorite profiles persist across Raycast restarts and appear
  at the top of the list every time.
- **SC-007**: The extension correctly detects newly installed browsers and
  new profiles without requiring manual reconfiguration.
- **SC-008**: All error states (no browsers, inaccessible profiles, corrupt
  data) display actionable guidance rather than empty screens or crashes.

## Assumptions

- Users are on macOS (Raycast requirement).
- Chromium-based browsers store profiles in predictable filesystem
  locations under `~/Library/Application Support/<BrowserName>/`.
- Each profile directory contains a `Preferences` or `Local State` JSON
  file with the profile's display name and avatar metadata.
- Browsers can be launched with a `--profile-directory` command-line flag
  to target a specific profile.
- Raycast quicklinks support deeplinks to extension commands with
  arguments, allowing profile-specific quicklinks.
- Window detection and show/hide behavior can be achieved via macOS
  system APIs or scripting available to a Raycast extension's Node.js
  runtime.
- Profile avatars are stored locally within the profile directory and can
  be read as image files.
