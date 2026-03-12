# Feature Specification: Focus Open Profile Window

**Feature Branch**: `002-focus-open-window`
**Created**: 2026-03-12
**Status**: Draft
**Input**: User description: "If a window of the profile triggered is already open, bring it to the forefront."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Bring Open Profile Window to Forefront (Priority: P1)

As a user, when I trigger a browser profile (via quicklink hotkey or from the profile list), if that profile already has an open window, I want that window to be brought to the forefront immediately — regardless of whether it is behind other windows, minimized, or already visible.

Currently, the extension toggles behavior: if the profile window is the frontmost window, it gets minimized. This feature changes the behavior so that triggering an already-open profile always brings it to the front, never minimizes it.

**Why this priority**: This is the entire scope of the feature. Users expect a consistent "focus this profile" action, similar to how clicking an app icon in the Dock always brings it forward.

**Independent Test**: Trigger a profile that already has a window open behind other applications and verify it comes to the forefront. Trigger it again while it is already frontmost and verify it stays visible (not minimized).

**Acceptance Scenarios**:

1. **Given** a profile window is open but behind other windows, **When** the user triggers the profile, **Then** the profile window is brought to the forefront
2. **Given** a profile window is minimized, **When** the user triggers the profile, **Then** the profile window is restored from the Dock and brought to the forefront
3. **Given** a profile window is already the frontmost window, **When** the user triggers the profile, **Then** the window remains visible and in the forefront (no minimize)
4. **Given** the profile has no open window, **When** the user triggers the profile, **Then** the browser launches with that profile (unchanged behavior)

---

### Edge Cases

- What happens when the browser process is running but the specific profile has no window open (e.g., all windows for that profile were closed)? The system should launch a new window for that profile.
- What happens when the user has multiple windows for the same profile? The topmost (most recently active) window for that profile should be raised.
- What happens if Accessibility permissions are not granted? The system should fall back to activating the browser application without per-window control, and show an informational message.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: When a profile is triggered, the system MUST bring any existing window for that profile to the forefront
- **FR-002**: When a profile window is already the frontmost window and the user triggers the profile again, the system MUST keep the window visible (no minimize/toggle behavior)
- **FR-003**: When a profile window is minimized, the system MUST restore it and bring it to the forefront
- **FR-004**: When no window exists for the triggered profile, the system MUST launch the browser with that profile (existing behavior, unchanged)
- **FR-005**: The focus behavior MUST apply consistently whether the profile is triggered via quicklink hotkey or from the profile list
- **FR-006**: When multiple windows exist for the same profile, the system MUST raise the most recently active one

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Triggering an already-open profile brings its window to the forefront within 1 second, 100% of the time
- **SC-002**: Triggering a frontmost profile window zero times results in the window being minimized (current minimize-on-frontmost behavior is fully removed)
- **SC-003**: Users can rely on the profile trigger as a consistent "show me this profile" action without unexpected side effects

## Assumptions

- The existing window detection mechanism (matching window title to profile display name) remains reliable and unchanged
- Removing the minimize-on-frontmost toggle behavior is the desired change; users who want to minimize can use standard macOS window controls (Cmd+M, yellow button)
- The change affects both the profile list command and quicklink-triggered command identically
