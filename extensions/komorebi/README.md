# Komorebi

Simple Raycast extension to run `komorebic` commands from Raycast.

It literally just runs `komorebic` commands in the terminal, so you need to have [komorebi](https://github.com/LGUG2Z/komorebi) installed and configured on your machine.

## Features

This extension currently supports basic komorebi operations:
- Stop komorebi
- Window management (focus, move, resize)
- Workspace switching
- Stack operations and stackbar configuration
- Toggle pause
- Retile windows
- Windows Explorer restart

## Why no Start/Restart commands for komorebi?

Starting komorebi from Raycast doesn't work reliably due to Windows' process ownership model.

**The problem:** Komorebi needs to be a child of the Windows shell (explorer.exe) to properly manage windows. Raycast extensions, however, run in a managed Node.js runtime that doesn't participate in the shell's message pump, so komorebi can't get the necessary privileges to control windows system-wide.

**The solution:** Run `komorebic start --whkd` directly from PowerShell/CMD to start komorebi. Once it's running, you can use this extension to control it.

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
