# Agent Night Watch

Keep local agents running when a MacBook lid is closed, using a coffee-cup
switch in the Raycast menu bar.

- Empty cup: normal closed-lid sleep.
- Steaming cup: Agent Night Watch is active.
- Enabling asks for macOS administrator authorization every time.
- Disabling an owned session does not ask again.
- The display can still turn off according to macOS settings.

Unlike Coffee and other `caffeinate` wrappers, Agent Night Watch controls the
closed-lid `SleepDisabled` setting and reads it back before reporting success.

## Setup

1. Enable **Night Watch Menu Bar** to keep the coffee cup visible.
2. Optionally assign `⌥S` to **Toggle Night Watch** in Raycast Settings.
3. Click **Enable Agent Night Watch** and approve the macOS dialog.
4. Click **Disable Agent Night Watch** when the job finishes.

## Safety

Closed-lid work can increase heat and battery use. Keep the MacBook on a hard,
ventilated surface. This extension does not add a timer or battery cutoff, so
you remain responsible for turning it off.

If sleep was disabled by another tool, Agent Night Watch will not claim that
session. The menu offers a separately confirmed, administrator-authorized
recovery action.

No password is stored. No privileged helper, sudoers rule, analytics, or
network request is used.
