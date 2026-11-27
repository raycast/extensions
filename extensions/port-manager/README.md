# Port Manager Extension

Find processes that are listening on TCP ports, name frequently used ports, and terminate the associated process directly from Raycast.

## Commands

- **Open Ports** lists TCP listeners, their ports, process details, and available actions.
- **Kill Process Listening on** terminates every process listening on a port you provide. Results and errors are shown in a toast.
- **Named Ports** lets you assign memorable labels to ports in the list.
- **Open Ports in Menu Bar** provides the open-port list from the macOS menu bar.

## Runtime and framework detection

**Open Ports** shows what each listener is running as its icon and in the detail panel. The runtime comes from the executable (`node`, `bun`, `python3`, `postgres`, `redis-server`, …). For interpreted runtimes, the framework comes from the command line (`node_modules/.bin/astro`, `manage.py`, `uvicorn`, …). On macOS, a Node.js, Bun or Deno server whose command line names no framework is matched against the nearest `package.json` above its working directory, which finds libraries such as Express and narrows `vite` down to SvelteKit, React Router or SolidStart. Windows does not expose other processes' working directories, so detection there uses the command line only.

Runtime and framework logos are from [Simple Icons](https://simpleicons.org/) ([CC0](https://github.com/simple-icons/simple-icons/blob/develop/LICENSE.md)). Brand logos remain trademarks of their owners.

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

A kill is only reported as successful once the process has actually exited. A process that ignores the signal is reported as still running, with a one-key **Force Kill** to follow up with `SIGKILL`.

Some system-owned processes and executable paths are protected by the operating system. The extension will show the command error in Raycast when the current user lacks permission; use an elevated terminal only when you understand the process you are stopping.
