# Tomito Controls

A set of commands to control Tomito, a Pomodoro app.

## Commands

**Start/Pause/Resume**: Starts, pauses, or resumes the current interval

**Start Tomito**: Starts the current interval and optionally enables Focus

**Pause Tomito**: Pauses the current interval and optionally disables Focus

**Resume Tomito**: Resumes the current interval and optionally enables Focus

**Restart**: Restarts the current interval

**Finish Tomito\***: Finishes the current interval and optionally disables Focus

**Finish and Start Next\***: Finishes the current interval and immediately starts the next one

**Skip**: Skips the current interval

_\*Only use if "Manually finish sessions and breaks" is selected in preferences_

**Hide**: Hides the timer window

**Show**: Shows the timer window

**Toggle Timer Widget** Shows or hides the timer widget

## Focus Synchronization

Focus synchronization is disabled by default. To enable it, create two macOS Shortcuts: one that enables your preferred Focus mode and one that disables it. Then enter their exact names and turn on **Focus Synchronization** in the extension preferences.

On first use, macOS may ask whether Raycast can control Shortcuts Events. Choose **Allow** so Raycast can run the configured Shortcuts. If access was denied, enable it in **System Settings → Privacy & Security → Automation**.

Focus synchronization applies only to the explicit **Start Tomito**, **Pause Tomito**, **Resume Tomito**, and **Finish Tomito** commands. Shortcut failures do not prevent the Tomito action from completing. The combined **Start/Pause/Resume** and **Finish and Start Next** commands retain their existing behavior.
