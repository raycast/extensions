# Tasks: Chromium Browser Profile Shortcuts

**Input**: Design documents from `/specs/001-chromium-profile-shortcuts/`
**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, contracts/

**Tests**: No tests explicitly requested in the feature specification. Build and lint gates serve as the primary quality checks per the constitution.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Raycast extension**: `src/` at repository root, assets in `assets/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the Raycast extension project with correct manifest, TypeScript config, and assets

- [x] T001 Initialize Raycast extension project with `package.json` manifest: set name to `browser-profile-launcher`, title to `Browser Profile Shortcuts`, declare `browse-profiles` command (mode: `view`) and `open-profile` command (mode: `no-view`), add `@raycast/api` and `@raycast/utils` as dependencies, configure `ray develop`/`ray build`/`ray lint` scripts in `package.json`
- [x] T002 Create `tsconfig.json` with `"strict": true`, targeting ES2021/Node16, include `src/**/*.ts` and `src/**/*.tsx` in `tsconfig.json`
- [x] T003 [P] Add browser icon assets: `assets/extension-icon.png`, `assets/chrome.png`, `assets/edge.png`, `assets/brave.png`, `assets/arc.png`, `assets/vivaldi.png` in `assets/`
- [x] T004 [P] Define shared TypeScript interfaces for Browser, Profile, ProfileCache, and OpenProfileContext types in `src/types.ts` — use fields from data-model.md exactly (Browser: id, name, bundleId, applicationPath, profileRootPath, icon, processName; Profile: id, browserId, directoryName, displayName, avatarPath, gaiaName)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core modules shared by ALL user stories — browser detection, profile scanning, storage

**CRITICAL**: No user story work can begin until this phase is complete

- [x] T005 Implement browser registry as a constant array of all 5 Browser objects in `src/browsers.ts` — include Chrome (`~/Library/Application Support/Google/Chrome/`), Edge (`~/Library/Application Support/Microsoft Edge/`), Brave (`~/Library/Application Support/BraveSoftware/Brave-Browser/`), Arc (`~/Library/Application Support/Arc/User Data/`), Vivaldi (`~/Library/Application Support/Vivaldi/`) with correct applicationPath, bundleId, processName, and icon reference per research.md section 1
- [x] T006 Implement profile scanning logic in `src/profiles.ts` — export `scanAllProfiles(browsers: Browser[]): Promise<Profile[]>` that: (1) checks if each browser's app bundle exists at applicationPath, (2) reads `Local State` JSON from each browser's profileRootPath, (3) parses `profile.info_cache` to extract profile directory names and display names, (4) checks for `Google Profile Picture.png` in each profile directory for avatarPath, (5) returns array of Profile objects with composite IDs (`browserId:directoryName`), (6) gracefully handles missing/corrupt files by logging warning and skipping that browser/profile per FR-010
- [x] T007 [P] Implement storage helpers in `src/storage.ts` — export `getCachedProfiles(): Promise<ProfileCache | null>`, `setCachedProfiles(profiles: Profile[]): Promise<void>` (stores with `scannedAt` timestamp), `getFavorites(): Promise<string[]>`, `setFavorites(ids: string[]): Promise<void>` using Raycast `LocalStorage` with keys `profiles-cache` and `favorite-profiles` per contracts/commands.md storage contracts

**Checkpoint**: Foundation ready — browser detection, profile scanning, and storage work. User story implementation can begin.

---

## Phase 3: User Story 1 — Browse and Open Any Profile (Priority: P1) MVP

**Goal**: Users can open the "Browse Profiles" command, see all profiles from all installed Chromium browsers in a searchable grouped list, and open any profile by pressing Enter.

**Independent Test**: Open the command on a Mac with at least 2 Chromium browsers with multiple profiles. Verify all profiles appear grouped by browser. Select a profile and confirm the correct browser opens with that profile.

### Implementation for User Story 1

- [x] T008 [US1] Create the main `browse-profiles.tsx` command in `src/browse-profiles.tsx` — implement a Raycast `List` component that: (1) on mount, loads profiles from cache via `getCachedProfiles()`, (2) if cache is empty, calls `scanAllProfiles()` and stores result via `setCachedProfiles()`, (3) renders profiles grouped by browser using `List.Section` with browser name as title, (4) each `List.Item` shows profile displayName as title, browser name as subtitle, and browser icon (from `assets/{browserId}.png`), (5) displays profile avatar as icon if avatarPath is non-null, otherwise uses browser icon
- [x] T009 [US1] Add "Open Profile" action to the action panel in `src/browse-profiles.tsx` — as the primary Enter action, execute `open -a "{browserName}" --args --profile-directory="{directoryName}"` using `execSync` from `child_process` (or Raycast's exec utilities), then call `closeMainWindow()` from `@raycast/api` to dismiss Raycast after launching
- [x] T010 [US1] Add "Refresh Profiles" action (shortcut `⌘+R`) to the action panel in `src/browse-profiles.tsx` — calls `scanAllProfiles()`, updates cache via `setCachedProfiles()`, and refreshes the list state in place without closing the command
- [x] T011 [US1] Implement error and empty states in `src/browse-profiles.tsx` — (1) if no browsers are installed, show `List.EmptyView` with title "No Supported Browsers Found" and description listing the 5 supported browsers, (2) if a browser's profile directory is inaccessible, show that browser's section with a single item displaying a warning message, (3) show loading state via `List` `isLoading` prop while scanning

**Checkpoint**: User Story 1 complete. Users can browse, search, and open any profile. This is a functional MVP.

---

## Phase 4: User Story 2 — Create Quicklink Shortcuts for Profiles (Priority: P2)

**Goal**: Users can create Raycast quicklinks for any profile, enabling them to assign global hotkeys for instant profile access.

**Independent Test**: From the profile list, create a quicklink for a profile. Verify the quicklink appears in Raycast's quicklinks. Assign a hotkey, press it, and confirm the profile opens.

### Implementation for User Story 2

- [x] T012 [US2] Create the `open-profile.ts` no-view command in `src/open-profile.ts` — implement as an async function that: (1) receives `OpenProfileContext` via `props.launchContext` (browserId, profileDirectory, displayName), (2) looks up the browser from the registry in `src/browsers.ts`, (3) executes `open -a "{browserName}" --args --profile-directory="{profileDirectory}"`, (4) shows HUD confirmation via `showHUD("Opened {displayName} — {browserName}")`, (5) handles missing browser with HUD error `"{browserName} is not installed"`, (6) handles missing launchContext with HUD error `"No profile specified"`
- [x] T013 [US2] Add "Create Quicklink" action (shortcut `⌘+L`) to the action panel in `src/browse-profiles.tsx` — use `Action.CreateQuicklink` with `createDeeplink()` from `@raycast/utils` targeting the `open-profile` command with `context: { browserId, profileDirectory: directoryName, displayName }` and quicklink name `"Open {displayName} — {browserName}"`

**Checkpoint**: User Story 2 complete. Users can create quicklinks with hotkeys for any profile.

---

## Phase 5: User Story 3 — Toggle Profile Visibility / Show/Hide (Priority: P3)

**Goal**: When a profile is triggered (via quicklink or list), the extension toggles its window: bring to front if not focused, minimize if frontmost, launch if not running.

**Independent Test**: Open a profile, switch to another app, trigger the profile again — verify it comes to front. Trigger again while frontmost — verify it minimizes. Close the browser, trigger again — verify it launches.

### Implementation for User Story 3

- [x] T014 [P] [US3] Implement window state detection in `src/window-manager.ts` — export `getWindowState(processName: string, profileName: string): Promise<"frontmost" | "open" | "minimized" | "closed">` that executes AppleScript via `osascript` to: (1) check if the browser process is running, (2) if running, enumerate windows of that process via System Events, (3) find a window whose name contains the profile's displayName, (4) determine if that window is the frontmost window of the frontmost app, (5) check if the window's AXMinimized attribute is true, (6) return the appropriate state string, (7) catch errors (e.g., no Accessibility permission) and return `"closed"` as fallback
- [x] T015 [P] [US3] Implement window actions in `src/window-manager.ts` — export `bringWindowToFront(processName: string, profileName: string): Promise<void>` (AppleScript: set frontmost, AXRaise on matching window) and `minimizeWindow(processName: string, profileName: string): Promise<void>` (AppleScript: set AXMinimized to true on matching window) per research.md section 4 AppleScript patterns
- [x] T016 [US3] Integrate toggle logic into `src/open-profile.ts` — replace the simple launch logic with: (1) call `getWindowState()` with the browser's processName and profile displayName, (2) if `"frontmost"` → call `minimizeWindow()` and show HUD `"Minimized {displayName}"`, (3) if `"open"` or `"minimized"` → call `bringWindowToFront()` and show HUD `"Focused {displayName}"`, (4) if `"closed"` → launch via `open -a` as before
- [x] T017 [US3] Also integrate toggle into `src/browse-profiles.tsx` — update the "Open Profile" Enter action to use the same toggle logic from `src/window-manager.ts` (detect state → minimize/focus/launch) instead of always launching, so both the list and quicklinks share identical behavior

**Checkpoint**: User Story 3 complete. Profiles behave like apps with show/hide toggle.

---

## Phase 6: User Story 4 — Manage Favorite Profiles (Priority: P4)

**Goal**: Users can mark profiles as favorites and see them in a dedicated top section of the list.

**Independent Test**: Mark 2 profiles as favorites, reopen the command, verify they appear in a "Favorites" section at the top with remaining profiles below.

### Implementation for User Story 4

- [x] T018 [US4] Add "Add to Favorites" / "Remove from Favorites" toggle action (shortcut `⌘+F`) to the action panel in `src/browse-profiles.tsx` — read current favorites via `getFavorites()` from `src/storage.ts`, toggle the selected profile's ID in the array, save via `setFavorites()`, update local state to re-render the list immediately
- [x] T019 [US4] Split the profile list into two sections in `src/browse-profiles.tsx` — render a "Favorites" `List.Section` at the top containing profiles whose IDs are in the favorites array, followed by per-browser `List.Section` groups for remaining profiles; if no favorites are set, omit the Favorites section entirely; favorite items should show a star accessory icon

**Checkpoint**: User Story 4 complete. Favorites persist and appear at the top of the list.

---

## Phase 7: User Story 5 — Configure Browser Sources (Priority: P5)

**Goal**: Users can enable/disable specific browsers via extension preferences to control which profiles appear.

**Independent Test**: Disable Edge in preferences, reopen the profile list, verify Edge profiles are gone. Re-enable and verify they reappear.

### Implementation for User Story 5

- [x] T020 [US5] Add extension preferences to `package.json` — define 5 checkbox preferences (`enableChrome`, `enableEdge`, `enableBrave`, `enableArc`, `enableVivaldi`) all defaulting to `true`, with descriptive titles per contracts/commands.md extension preferences table
- [x] T021 [US5] Filter profiles by enabled browsers in `src/browse-profiles.tsx` — read preferences via `getPreferenceValues()` from `@raycast/api`, filter the browser list before passing to `scanAllProfiles()` (or filter results after scan), show an empty state with message "All browsers are disabled. Enable at least one in extension preferences." when no browsers are enabled and link to Raycast preferences via action panel

**Checkpoint**: User Story 5 complete. Users can control which browsers to include.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Final quality checks and cleanup

- [x] T022 Run `ray lint` and fix any linting errors across all source files
- [x] T023 Run `ray build` and verify the extension compiles without errors
- [x] T024 Validate against quickstart.md: walk through the full verification checklist (browse profiles, open profile, create quicklink, toggle show/hide, favorites, refresh, preferences)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Phase 2 — core MVP
- **US2 (Phase 4)**: Depends on Phase 2 — can run parallel to US1 but benefits from US1's browse-profiles.tsx
- **US3 (Phase 5)**: Depends on Phase 2 + US2's open-profile.ts
- **US4 (Phase 6)**: Depends on Phase 2 + US1's browse-profiles.tsx
- **US5 (Phase 7)**: Depends on Phase 2 + US1's browse-profiles.tsx
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Independent — creates `browse-profiles.tsx` (MVP)
- **US2 (P2)**: Creates `open-profile.ts`; adds quicklink action to `browse-profiles.tsx`
- **US3 (P3)**: Modifies `open-profile.ts` (toggle logic); creates `window-manager.ts`
- **US4 (P4)**: Modifies `browse-profiles.tsx` (favorites section)
- **US5 (P5)**: Modifies `package.json` (preferences) + `browse-profiles.tsx` (filtering)

### Recommended Execution Order

US1 → US2 → US3 → US4 → US5 (sequential, priority order)

US4 and US5 could run in parallel after US1, but since they both modify `browse-profiles.tsx`, sequential execution avoids merge conflicts.

### Parallel Opportunities

- T003 and T004 can run in parallel (different files)
- T006 and T007 can run in parallel (different files, no dependencies)
- T014 and T015 can run in parallel (same file but independent functions)

---

## Parallel Example: Phase 2 (Foundational)

```bash
# These can run in parallel (different files):
Task T006: "Profile scanning logic in src/profiles.ts"
Task T007: "Storage helpers in src/storage.ts"
```

## Parallel Example: User Story 3

```bash
# These can run in parallel (independent functions in same module):
Task T014: "Window state detection in src/window-manager.ts"
Task T015: "Window actions in src/window-manager.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational
3. Complete Phase 3: User Story 1 (Browse and Open)
4. **STOP and VALIDATE**: Open the extension, verify profiles appear, open a profile
5. This is a usable extension at this point

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Browse and open profiles (MVP!)
3. US2 → Quicklink shortcuts for instant access
4. US3 → Show/hide toggle for app-like behavior
5. US4 → Favorites for power users
6. US5 → Browser filtering preferences
7. Polish → Final validation

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Commit after each task or logical group
- Stop at any checkpoint to validate the story independently
- No test tasks generated — the spec did not request explicit tests; `ray lint` + `ray build` + manual quickstart validation serve as quality gates
