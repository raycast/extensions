# Port Manager Changelog

## [New Preferences] - 2024-11-25

- Added preferences to customize the primary action of the `Open Port` command

## [New Command] - 2024-03-14

- Added a new command to quickly kill a port 

## [Improved Menu Bar Command] - 2024-01-18

- Improved menu bar commands
- Caches the opened ports, so opening the extension feels instant
- Removed the preference to use `sudo` for listing and killing processes
- Added the "named ports" feature (special thanks to [@Sheraff](https://www.raycast.com/Sheraff))
- Made command names more concise

## [Menu Bar Command] - 2023-08-18

- Added simple menu bar command
- Added preference to always use the same kill signal
- Changed shortcut to kill parent process from `⌘` + `p` to `⌘` + `⌥` + `p`
- Changed shortcut to show process info from `⌘` + `i` to `⌘` + `⇧` + `d`
- Use color and icon in alerts
- Fixed bug where the extension would crash when `lsof` returned a warning, thank you [Grzegorz Leoniec](https://github.com/appinteractive)

## [New Actions] - 2022-07-15

- *Show Info* action (`⌘` + `i`) to display process information
- *Show in Finder* action (`⌘` + `f`) to reveal the executable of a process in Finder
- *Kill Parent* action (`⌘` + `p`) to kill the parent process of a process opening a port
  - For obvious reasons *not available* if the PID of the parent process is either `0` (`kernel`) or `1` (`launchd`)
- Some changed wording
  - Navigation title of *Kill Port* command is now, well, *Kill Port*
  - Improved description of the extension
- Improved README
- Added a changelog
- Added screenshots

## [Initial Release] - 2022-02-21

- List open ports and their processes
- Kill them either with `SIGTERM` or `SIGKILL`
- Use `killall` to kill processes by name
- Copy Information about a process
  - PID
  - Parent Process PID
  - User UID
  - User Name
- Copy commands to kill process manually via the commandline
