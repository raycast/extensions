# Port Manager Changelog

## [New Actions] - 2021-11-04

- *Show Info* action (`⌘` + `i`) to display process information
- *Show in Finder* action (`⌘` + `f`) to reveal the executable of a process in Finder
- *Kill Parent* action (`⌘` + `p`) to kill the parent process of a process opening a port
  - For obvious reasons not available if the PID of the parent process is either 0 (kernel) or 1 (launchd)
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
