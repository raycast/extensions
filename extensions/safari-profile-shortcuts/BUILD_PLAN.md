# Safari Profile Shortcuts Build Plan

## Goal

Provide five configurable Raycast command slots. Each configured slot opens a new Safari window for one profile and can have its own global hotkey.

Users can:

- Rename a slot by changing its Safari profile name.
- Add a profile by filling an empty slot and assigning its command a hotkey.
- Remove a profile by clearing its slot, removing its hotkey, and disabling its command.

Every configured name must match a Safari profile name exactly. The extension turns `Work` into Safari's `New Work Window` menu item.

## Scope and assumptions

- The extension provides five static command slots because Raycast commands and their global hotkeys must be declared in the manifest.
- Slots 1-3 default to `Personal`, `School`, and `Work`.
- Slots 4-5 start empty.
- Safari 17 or later is installed and each configured profile already exists in Safari.
- The first version targets English Safari menu labels.
- The extension manages Raycast's profile-name settings only; it does not create, rename, or delete Safari's actual profiles.
- Raycast owns hotkey assignment. The extension does not prescribe default shortcuts.

## Architecture

```text
Global hotkey
  -> one of five static Raycast no-view commands
  -> read that slot's profile name from extension preferences
  -> shared openSafariProfile(profileName) helper
  -> AppleScript via @raycast/utils
  -> Safari File menu
  -> New <Profile> Window
```

Safari's scripting dictionary does not expose a profile-opening API. Use Safari's native `File -> New <Profile> Window` menu through System Events, matching Apple's documented user flow. Keep preference validation, UI automation, and error handling in shared code.

## M1: Define five configurable command slots

Update `package.json`:

- Restrict `platforms` to `macOS`; Safari and `runAppleScript` are unavailable on Windows.
- Replace the profile-specific commands with five generic `no-view` commands:
  - `new-profile-window-1`
  - `new-profile-window-2`
  - `new-profile-window-3`
  - `new-profile-window-4`
  - `new-profile-window-5`
- Use stable titles such as `New Safari Profile Window 1` through `New Safari Profile Window 5`. Titles cannot be created or renamed dynamically at runtime.
- Give every command a non-empty description.
- Add five optional extension-level `textfield` preferences:

  | Preference | Title | Default |
  | --- | --- | --- |
  | `profile1` | Profile Slot 1 | `Personal` |
  | `profile2` | Profile Slot 2 | `School` |
  | `profile3` | Profile Slot 3 | `Work` |
  | `profile4` | Profile Slot 4 | Empty |
  | `profile5` | Profile Slot 5 | Empty |

- Explain in each preference description that the value must exactly match the Safari profile name.
- Remove the trailing space from the extension description.
- Do not add dependencies. The installed Raycast packages already provide preferences, AppleScript execution, and failure feedback.

### Completion criteria

- The manifest declares only macOS support.
- Exactly five commands and five matching profile preferences exist.
- Slots 1-3 have useful defaults and slots 4-5 are optional and empty.
- Command names map directly to five source entry-point files.

## M2: Implement preference lookup and validation

Create shared code that maps each command slot to its extension preference:

```ts
type ProfileSlot = "profile1" | "profile2" | "profile3" | "profile4" | "profile5";
```

Expose one command-facing function:

```ts
openConfiguredProfile(slot: ProfileSlot): Promise<void>
```

It should:

1. Read the current extension preferences with `getPreferenceValues`.
2. Obtain the profile name for the requested slot.
3. Trim accidental leading and trailing whitespace while preserving spaces inside the name.
4. If the slot is empty, show a failure message explaining that the user must configure it in Raycast extension settings, then stop without launching Safari.
5. Pass the validated name to the shared Safari launcher.

Keep the slot union and lookup in the same helper file unless separating them measurably improves clarity.

### Completion criteria

- All five commands read current settings on every invocation, so edits take effect without rebuilding.
- Empty slots fail visibly and never click an unrelated Safari menu item.
- No slot-specific preference-reading logic is duplicated across command files.

## M3: Implement the shared Safari profile launcher

Create `src/open-safari-profile.ts` containing the preference lookup and Safari launcher, unless the file becomes difficult to read.

Implementation requirements:

1. Call `runAppleScript` with the validated profile name in its `arguments` array. Do not interpolate user settings into AppleScript source.
2. Launch Safari in a way that avoids creating an unrelated default-profile window during a cold start. Prefer AppleScript's `launch`, then bring the Safari process to the foreground through System Events.
3. Build the target menu label as `New <Profile> Window`.
4. Open Safari's File menu and check that the exact target menu item exists.
5. Click the item to create a new profile window.
6. If the item is absent, throw a clear error explaining that the configured name does not match a Safari profile.
7. Catch errors in TypeScript and await `showFailureToast`, using a title that includes the requested profile.
8. Do not show success feedback; the new Safari window is sufficient confirmation.

The AppleScript should remain static and receive only arguments. Keep it inside the TypeScript helper rather than adding a separate `.scpt` asset.

### Known ceiling

Menu-label construction assumes English Safari labels. Mark this deliberate limit near the AppleScript with a `ponytail:` comment. Add locale-aware matching only if the extension must support non-English macOS installations.

### Completion criteria

- All Safari automation lives in one helper.
- Profile names containing quotes or other special characters cannot alter the script.
- Missing profiles and permission failures surface through Raycast feedback.
- A cold Safari launch does not leave an extra default-profile window.

## M4: Connect the five command entry points

Create five thin entry-point files:

- `src/new-profile-window-1.ts` calls `openConfiguredProfile("profile1")`.
- `src/new-profile-window-2.ts` calls `openConfiguredProfile("profile2")`.
- `src/new-profile-window-3.ts` calls `openConfiguredProfile("profile3")`.
- `src/new-profile-window-4.ts` calls `openConfiguredProfile("profile4")`.
- `src/new-profile-window-5.ts` calls `openConfiguredProfile("profile5")`.

Remove the obsolete empty entry points:

- `src/new-personal-window.ts`
- `src/new-school-window.ts`
- `src/new-work-window.ts`

Each new file should only import the shared helper and export the command function. Do not duplicate AppleScript, validation, or error handling.

### Completion criteria

- Each command reads the correct preference slot.
- No command contains duplicated launch logic.
- Each command returns or awaits the helper promise so Raycast tracks completion and errors.

## M5: Document profile-slot management

Update `README.md` with:

- The extension's purpose and five-slot limit.
- Safari 17+ requirement.
- Instructions to create profiles in Safari before configuring them in Raycast.
- Local setup commands:

  ```bash
  npm install
  npm run dev
  ```

- First-run macOS permission guidance for Raycast under:
  - Privacy & Security -> Accessibility
  - Privacy & Security -> Automation
- Instructions to open Raycast's extension settings and edit Profile Slots 1-5.
- Profile-management behavior:
  - Rename: update the slot value to the exact Safari profile name.
  - Add: fill an empty slot, enable its command, and assign a hotkey.
  - Remove: clear the slot, delete its hotkey, and disable its command.
- Hotkey assignment through Configure Command or Raycast Settings -> Shortcuts.
- The English-menu-label limitation.

Update `CHANGELOG.md` with an initial entry describing the five configurable profile slots and profile-specific window launching.

### Completion criteria

- A new user can configure, rename, add, remove, and assign hotkeys to profile slots using only the README.
- The README makes clear that Safari profiles themselves must be managed in Safari.
- The changelog describes the implemented behavior.

## M6: Verify the implementation

Run the standard Raycast checks:

```bash
npm run lint
npm run build
npm run dev
```

Perform one manual integration pass because automated tests cannot meaningfully verify macOS menu interaction without driving the real Safari UI:

| Scenario | Expected result |
| --- | --- |
| Slot 1 uses its default | A new Personal profile window opens. |
| Slot 4 is empty | Raycast reports that the slot must be configured; Safari is unchanged. |
| Slot 4 is configured with an existing profile | A new window opens in that profile without rebuilding. |
| A configured name is changed | The next invocation uses the new name. |
| A configured name does not exist in Safari | Raycast shows a useful failure message. |
| Safari is not running | Exactly one window opens in the requested profile. |
| Safari is running in another profile | A new window opens in the requested profile. |
| The requested profile already has a window | Another new window opens; the existing window is not merely focused. |
| Accessibility or Automation permission is denied | Raycast shows the macOS automation error instead of failing silently. |
| A command is launched by hotkey from another application | The configured Safari profile window opens globally. |

If cold launch creates an extra default window, replace Safari activation with `launch` followed by setting the Safari process frontmost before opening the File menu.

### Completion criteria

- `npm run lint` passes.
- `npm run build` passes.
- All five slots pass configuration and empty-slot behavior checks.
- Every configured command passes the Safari integration checks.

## Final acceptance criteria

- The extension exposes exactly five independently hotkey-addressable slots.
- Editing a slot changes its target profile without a rebuild.
- Filling an empty slot adds a usable profile command.
- Clearing and disabling a slot removes it from normal use.
- Every configured invocation creates a new Safari window in the selected profile.
- Missing configuration, missing profiles, and permission failures are visible and actionable.
- The extension is macOS-only and remains a minimal no-view utility.

## Deferred work

- More than five profile slots.
- Truly dynamic Raycast commands; the Raycast manifest does not support runtime command creation.
- Automatic Safari profile discovery.
- A profile picker or React management UI.
- Localization-aware Safari menu matching.
- Default hotkeys in the extension manifest.
- Additional dependencies or a test framework.

Increase the fixed slot count only when five becomes a real constraint.

## References

- [Raycast manifest](https://developers.raycast.com/information/manifest)
- [Raycast preferences](https://developers.raycast.com/api-reference/preferences)
- [Raycast command API](https://developers.raycast.com/api-reference/command)
- [Raycast `runAppleScript`](https://developers.raycast.com/utilities/functions/runapplescript)
- [Raycast `showFailureToast`](https://developers.raycast.com/utilities/functions/showfailuretoast)
- [Raycast CLI](https://developers.raycast.com/information/developer-tools/cli)
- [Raycast command hotkeys](https://manual.raycast.com/command-aliases-and-hotkeys)
- [Apple Safari profiles](https://support.apple.com/en-ie/105100)
- [Apple Accessibility permission](https://support.apple.com/guide/mac-help/allow-accessibility-apps-to-access-your-mac-mh43185/mac)
- [Apple Automation permission](https://support.apple.com/guide/mac-help/allow-apps-to-automate-and-control-other-apps-mchl108e1718/mac)
