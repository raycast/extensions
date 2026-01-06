# WinDev Toolkit

Windows developer utilities for Raycast. List and kill processes by port.

## Commands

### List Open Ports

View all processes listening on TCP ports.

- Shows port number, process name, and PID
- Kill a process with Enter
- Copy port or PID to clipboard
- Refresh with Cmd+R

### Kill Port

Quickly kill a process by port number.

- Enter a port (1-65535)
- Finds and terminates the process
- Reports success or failure

## Requirements

- Windows 10 (21H2+) or Windows 11
- Raycast for Windows

## Install

```
npm install
npm run dev
```

## Notes

- Some system processes require administrator privileges to kill
- Uses PowerShell's `Get-NetTCPConnection` and `Stop-Process`
