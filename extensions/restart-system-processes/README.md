# Restart System Processes

## Mac feeling sluggish?  Hit the refresh button on your system!

We’ve all been there: your trusty Mac starts acting up. Finder freezes, the Dock disappears, or your audio goes haywire. 😠

Instead of a full reboot, this extension lets you **surgically restart** individual system processes like Finder, Dock, Menu Bar, Audio and more!
Get back to work faster with a quick refresh. ✨

## Processes
By default, the following processes can be restarted:
- Finder
- Dock
- SystemUIServer (e.g. Menu Bar)
- Audio
- Bluetooth
- WindowServer

## Options
### Sudo
Some processes require root privileges to restart. However, this extension is unable to request you to enter your password. 
Therefore, if some processes are not working for you, then you have to enable Touch ID authentication for `sudo` command.

Simply follow the guide here: https://apple.stackexchange.com/a/466029.

### Advanced Mode
With this option enabled, all the currently-running system processes are listed. This means you can restart
**any** ⚡ system process on your Mac!

Additionally, the extension uses `launchctl stop` to restart them.