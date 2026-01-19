# Komorebi & YASB Control

Simple Raycast extension to run komorebic and yasbc commands from Raycast.

It literally just runs `komorebic` and `yasbc` commands in the terminal, so you need to have [komorebi](https://github.com/LGUG2Z/komorebi) and [YASB](https://github.com/amnweb/yasb) installed and configured on your machine.

## Features

This extension currently supports basic komorebi and YASB operations:
- Stop komorebi
- Start, stop, and reload YASB
- Window management (focus, move, resize)
- Workspace switching
- Stack operations and stackbar configuration
- Toggle pause
- Retile windows
- Windows Explorer restart

## Why no Start/Restart commands for komorebi?

Starting komorebi from Raycast doesn't work reliably due to Windows' process ownership model.

**The problem:** Komorebi needs to be a child of the Windows shell (explorer.exe) to properly manage windows. When YASB starts komorebi, it works because YASB itself is a tray app running as a shell descendant with access to the desktop message loop. Raycast extensions, however, run in a managed Node.js runtime that doesn't participate in the shell's message pump, so komorebi can't get the necessary privileges to control windows system-wide.

**The solution:** Use YASB's tray menu, a shell script, or run `komorebic start --whkd` directly from PowerShell/CMD to start komorebi. Once it's running, you can use this extension to control it.

**Note:** YASB doesn't have the same restriction since it's just a Python app that doesn't need shell-level window management privileges.

## Contributing

Feel free to contribute! This extension covers basic use cases, but komorebi has many more features that could be added. Pull requests are welcome.

## Development

1. Clone the repository.
2. Run `npm install` to install dependencies.
3. Run `npm run dev` to start the development server.
4. Raycast should automatically pick up the extension.
5. Make changes and test them in Raycast.
6. When you're done, run `npm run build` to ensure everything is built correctly.
7. Open a pull request with your changes.
