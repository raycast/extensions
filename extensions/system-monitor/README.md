<p align="center">
    <img src="./assets/command-icon.png" width="150" height="150" />
</p>

# System Monitor

This is a [Raycast](https://raycast.com/) extension that allows you to monitor your system's CPU, Memory, Disk and Battery usage.

❕ You can toggle between free and used display modes for CPU, Memory and more in `Preferences`.

## Custom Menubar Text

❕ You can customise the menubar dropdown text in `Preferences`. Hover over the textbox to see what tags are available for each module. There are two tags that are always available: `<BR>` adds a linebreak, and `<MODE>` shows "Free" and "Used" depending on display mode.

## Data and Privacy

- All system data (CPU, memory, disk, battery, processes) is read locally via macOS tools (`system_profiler`, `sysctl`, `ps`, `pmset`, `iostat`, `diskutil`); the extension makes no network requests.
- **System Info** and the **Copy System Report** action include your Mac's serial number and hostname. Review the report before sharing it.
