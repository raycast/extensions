# Sandglass - Simple Timer

A calm countdown timer for Raycast on Windows. Pick a preset or type a duration, then watch a glass sphere slowly fill with desert sand while the time runs down. When time is up, you get a Windows notification with sound, even when the Raycast window is closed.

## Commands

| Command                   | What it does                                                                                                          |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Start Timer**           | Choose a preset, a recent time or a custom time, or just type one. While a timer runs, this shows the live sand dial. |
| **Pause or Resume Timer** | Pauses the running timer, or resumes it, without opening Raycast.                                                     |
| **Stop Timer**            | Stops the current timer without opening Raycast.                                                                      |

Tip: give **Pause or Resume Timer** and **Stop Timer** a hotkey in Raycast's settings.

## Typing a time

Type into the search bar of **Start Timer**, or pass it as the argument (`Start Timer 25`):

| You type                | Timer                                  |
| ----------------------- | -------------------------------------- |
| `25`                    | 25 minutes                             |
| `1h 30m`, `1h30`, `90m` | 1 hour 30 minutes                      |
| `45s`, `2m 30s`         | seconds work too                       |
| `10:00`, `1:30:00`      | minutes:seconds, hours:minutes:seconds |
| `at 15:30`, `at 3pm`    | counts down to that time of day        |
| `tea 5m`                | 5 minutes, labeled "Tea"               |

## While a timer runs

- **Pause / Resume**: `Enter`
- **Add 1 Minute**: `Ctrl` + `=`
- **Restart**: `Ctrl` + `R`
- **Stop Timer**: `Ctrl` + `Backspace`
- **New Timer**: `Ctrl` + `N` (replaces the current timer)

The dial follows Raycast's light or dark appearance.

## When time is up

A Windows notification appears with your chosen sound. Its **5 more minutes** button starts a new 5-minute timer. The first time you use it, Raycast asks whether the command may run from outside Raycast; choose **Always Run Command** to skip that question in the future.

If you don't see notifications, check that notifications for Raycast are turned on in Windows Settings › System › Notifications, and that Do not disturb is off. If you restart Windows while a timer runs, open **Start Timer** once to turn its notification back on.

## Preferences

- **Alert Sound**: Gentle Chime (default), Alarm (repeats until you dismiss it) or Silent.

## Privacy

Sandglass works entirely on your computer. It doesn't use the internet and doesn't collect any data. The timer is saved in Raycast's local extension storage so it survives closing Raycast.
