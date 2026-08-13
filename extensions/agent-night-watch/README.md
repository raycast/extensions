# Agent Night Watch

Keep local agents running when a MacBook lid is closed, using a coffee-cup
switch in the Raycast menu bar.

- Empty cup: normal closed-lid sleep.
- Steaming cup: Agent Night Watch is active.
- Click the cup once to toggle directly during normal operation.
- Enabling asks for macOS administrator authorization every time.
- Disabling an owned session does not ask again.
- The display can still turn off according to macOS settings.

Unlike Coffee and other `caffeinate` wrappers, Agent Night Watch controls the
closed-lid `SleepDisabled` setting and reads it back before reporting success.

## Setup

1. Run **Night Watch Menu Bar** once to keep the coffee cup visible.
2. Optionally assign `⌥S` to **Toggle Night Watch** in Raycast Settings.
3. Click the coffee cup and approve the macOS dialog to enable it.
4. Click the coffee cup again to disable it when the job finishes.

## Safety

Closed-lid work can increase heat and battery use. Keep the MacBook on a hard,
ventilated surface. This extension does not add a timer or battery cutoff, so
you remain responsible for turning it off.

If sleep was disabled by another tool, Agent Night Watch will not claim that
session. In that exceptional state, clicking the cup opens a separately
confirmed, administrator-authorized recovery menu instead of toggling directly.

No password is stored. No privileged helper, sudoers rule, analytics, or
network request is used. The fixed privileged guard is embedded before the
authorization dialog and never executes or writes a user-controlled path.
