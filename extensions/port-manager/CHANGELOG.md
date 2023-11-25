# Port Manager Changelog

## [Menu Bar COmmand] - 2023-08-18

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
