# Lid Awake

Keep your Mac awake with the lid closed. Lid Awake uses `pmset -a disablesleep`, so the Mac keeps running when the lid is shut, and it turns that off again when you ask it to, when the timer ends, when the battery gets low, or after a restart.

## Setup

1. Run **Set up Lid Awake** and choose **Install Passwordless Toggle**. macOS asks for your admin password once.
2. Run **Lid Awake Menu Bar** once. Raycast menu bar commands must be run once before they appear in the menu bar, and this one is what turns Lid Awake off when the timer ends, the battery is low, or the Mac restarts.

Setup is required before Lid Awake can turn on, because it has to turn itself off later (timer, low battery, restart) without asking for a password.

## Commands

- **Set up Lid Awake**: installs or removes the passwordless rule that lets Lid Awake toggle sleep.
- **Keep Awake with Lid Closed**: pick 30 minutes, 1 hour, 2 hours, 4 hours, or indefinitely.
- **Allow Sleep**: turns Lid Awake off so the Mac can sleep normally.
- **Toggle Lid Awake**: turns Lid Awake on for your default duration, or off if it is already on.
- **Lid Awake Menu Bar**: shows the state and time left, and enforces the auto-off rules.

## Auto-off rules

- **Timer**: turns off when the chosen duration ends.
- **Low battery**: turns off when running on battery at or below the cutoff. Set it to Off to disable this.
- **Restart**: turns off after a reboot, since `pmset disablesleep` otherwise survives a restart.

These checks run every minute while Raycast is running.

## Preferences

- **Low Battery Cutoff**: Off, or 5% to 50% (default 20%).
- **Default Duration**: 30 minutes, 1 hour (default), 2 hours, 4 hours, or Indefinitely. Used by Toggle Lid Awake.

## What the setup installs

Setup adds `/etc/sudoers.d/raycast-lid-awake` with exactly this content, for your username:

```
<user> ALL=(root) NOPASSWD: /usr/bin/pmset -a disablesleep 0, /usr/bin/pmset -a disablesleep 1
```

It lets your user run only those two `pmset` commands as root without a password, and grants no other root access. The file is checked with `visudo` before it is installed.

To remove it, run **Set up Lid Awake** and choose **Remove Passwordless Toggle**. This also turns Lid Awake off if it is on. You can also run `sudo rm /etc/sudoers.d/raycast-lid-awake` yourself.

## Checking the state

```sh
pmset -g | grep SleepDisabled
```

It prints `1` when Lid Awake is on and `0` when it is off. If the extension is unavailable, this turns it off:

```sh
sudo pmset -a disablesleep 0
```
