# Fix Brightness Up/Down failing when triggered by hotkey

## Context

Issue [raycast/extensions#27085](https://github.com/raycast/extensions/issues/27085): the `Brightness Up` and `Brightness Down` commands work when launched from the Raycast launcher but silently fail when bound to a hotkey. The HUD still shows "Brightness increased/decreased" — the brightness just doesn't change.

### Root cause

`src/script.ts` synthesizes a brightness keypress via AppleScript:

```ts
return `tell application "System Events" to key code ${keyCode}`;
```

When the command is invoked via a hotkey, the user is still physically holding the hotkey modifier(s) (e.g. `Shift+→`) at the moment `runAppleScript` fires. macOS merges the held physical modifiers with the synthetic key code, so the system receives `Shift + F14/F15` (key codes 144/145) instead of bare `F14/F15`. Modified brightness keys are not interpreted as brightness adjustments, so nothing happens — but the toast still fires because the AppleScript itself succeeded. From the launcher this never reproduces because no modifier is held when the command runs.

This is also fragile on macOS 26 even without modifiers: synthesized brightness key codes are increasingly unreliable across macOS versions.

### Why we can fix this cleanly

The extension already integrates with Lunar (`src/utils/lunar.ts`, `src/set-brightness.ts`, `src/max-brightness.ts`) for the other commands. Lunar's CLI supports relative brightness adjustments against the cursor display natively — `lunar displays cursor brightness +10` / `-10` — so we can replace the AppleScript-key-injection path with a real brightness API call and stop relying on synthetic key events entirely. Relative-delta syntax is confirmed in Lunar's docs (Context7 `/alin23/lunar`).

## Approach

Replace the AppleScript key-code path in `up.ts` and `down.ts` with a Lunar-based relative brightness change targeting the cursor display via Lunar's built-in `cursor` selector.

### Files to modify

- `src/utils/lunar.ts` — add `adjustCursorBrightness(delta: number): Promise<{ name: string; brightness: number }>` helper that:
  - runs `lunar displays cursor brightness <+N|-N>` (Lunar clamps to 0–100 on its own, no JS-side math required),
  - reads back with `lunar displays cursor brightness --json` (or reuses `getDisplays` + `getCursorDisplay` + `getBrightnessForDisplay`) to report the new level and display name for the HUD,
  - wraps both calls in `retryWithBackoff`.
  - Note: we skip the adaptive-mode-disable dance that `set-brightness` does — relative deltas are the common case for a user pressing up/down repeatedly, and auto-disabling adaptive for hotkey presses would be surprising. If adaptive pushes brightness back, user can use `Set Brightness` / disable adaptive in Lunar themselves.
- `src/up.ts` — delete the AppleScript path; call `ensureLunarReady()` then `adjustCursorBrightness(+10)` and HUD the result.
- `src/down.ts` — same with `-10`.
- `src/script.ts` — delete (only `up.ts` and `down.ts` import it; confirmed by grep).
- `package.json` — remove `run-applescript` from `dependencies` (only `up.ts` and `down.ts` import it; confirmed by grep).
- `CHANGELOG.md` — add entry under a new dated heading describing the fix.

### New `up.ts` shape (analogous for `down.ts`)

```ts
import { showHUD, showToast, Toast } from "@raycast/api";
import { ensureLunarReady, adjustCursorBrightness } from "./utils/lunar";

export default async function Command() {
  if (!(await ensureLunarReady())) return;

  try {
    const { name, brightness } = await adjustCursorBrightness(+10);
    await showHUD(`${name}: ${brightness}%`);
  } catch (error) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to increase brightness",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
```

`down.ts` passes `-10` and uses "Failed to decrease brightness" as the failure title.

### Step size

10% per press matches the existing command descriptions in `package.json` ("Increases the brightness by 10% of your display"). Lunar handles clamping to `[0, 100]`, so repeated presses at the rails are safe.

### Why not keep the AppleScript path as a fallback

It already requires Lunar to be installed for the other two commands, and `ensureLunarReady` auto-installs it via Homebrew. Keeping a second code path doubles the maintenance surface and re-introduces the exact bug we're fixing. One path, one behavior.

### Out of scope: auto-updating Lunar

`ensureLunarReady` installs Lunar if missing but does not upgrade an existing install, and this PR keeps it that way. Running `brew upgrade --cask lunar` on every hotkey press would be slow and intrusive, and the `displays cursor brightness +N` CLI syntax we rely on has been supported by Lunar for years, so a version gate isn't needed. Adding periodic/background update checks is a separate feature — not bundled into this bug fix.

## Verification

1. `cd` to this extension’s directory and run `npm install` (run-applescript removed).
2. `npm run lint` — no errors.
3. `npm run dev` to load the extension into Raycast in dev mode.
4. Bind `Brightness Up` to `Shift+→` and `Brightness Down` to `Shift+←` in Raycast preferences.
5. Reproduce the original bug path:
   - Trigger via launcher → brightness changes, HUD shows new percentage. ✅
   - Trigger via `Shift+→` hotkey → brightness changes, HUD shows new percentage. ✅ (the failing case in the issue)
   - Trigger via hotkey rapidly 12× from 0% → caps at 100% without throwing.
   - Trigger via hotkey 12× from 100% on `Down` → floors at 0% without throwing.
6. With cursor on a secondary display, trigger hotkey → that display's brightness changes (not the main).
7. Uninstall Lunar, trigger hotkey → `ensureLunarReady` toast appears with install action (existing behavior, just confirming we didn't regress it).
8. Post a follow-up comment on issue #27085 with the dev build instructions so `connorwforsyth` can confirm the fix on his setup before submitting the PR upstream.
