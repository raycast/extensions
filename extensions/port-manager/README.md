# Port Manager Extension

Find processes that are listening on TCP ports, name frequently used ports, and terminate the associated process directly from Raycast.

## Commands

- **Open Ports** lists TCP listeners, their ports, process details, and available actions.
- **Kill Process Listening on** terminates every process listening on a port you provide. Results and errors are shown in a toast.
- **Named Ports** lets you assign memorable labels to ports in the list.
- **Open Ports in Menu Bar** provides the open-port list from the macOS menu bar.

## Platform support

| Capability                      | macOS                                  | Windows                                  |
| ------------------------------- | -------------------------------------- | ---------------------------------------- |
| List listening TCP ports        | Uses `netstat` with an `lsof` fallback | Uses `netstat.exe -ano -p TCP`           |
| Process details                 | Uses `ps` and `lsof`                   | Uses PowerShell and `Win32_Process`      |
| Kill by PID                     | Uses `kill` with the selected signal   | Uses forced `taskkill.exe /PID <pid> /F` |
| Kill all matching process names | Uses `killall`                         | Uses `taskkill.exe /IM <name> /F`        |
| Reveal executable               | Finder                                 | File Explorer                            |
| Menu bar command                | Supported                              | Not available in Raycast on Windows      |

On macOS, the **Kill Signal** preference controls whether to ask for `SIGTERM` or `SIGKILL`, or always use one. Windows does not support Unix signals, so every kill uses `taskkill /F`.

Some system-owned processes and executable paths are protected by the operating system. The extension will show the command error in Raycast when the current user lacks permission; use an elevated terminal only when you understand the process you are stopping.
