# GeForce NOW Raycast Extension

Simple Raycast command for searching and launching GeForce NOW games from your library.

## Notes

- This extension is built for Windows and requires the GeForce NOW app installed.
- It reads the local auth file at `%LOCALAPPDATA%\NVIDIA Corporation\GeForceNOW\sharedstorage.json`.
- It creates shortcut files in the Start Menu shortcut folder:
  - `%APPDATA%\Microsoft\Windows\Start Menu\Programs\NVIDIA Corporation\Games`
  - `%PROGRAMDATA%\Microsoft\Windows\Start Menu\Programs\NVIDIA Corporation\Games`
- The files created are `.lnk` shortcuts used to launch games through GeForce NOW.

## How it works

- The extension reads your GeForce NOW auth data from the local `sharedstorage.json` file.
- It fetches your library from the GeForce NOW API using that auth data.
- If a game does not already have a shortcut, it creates one in the Start Menu folders.
- Launching a game opens the shortcut, which starts the game through the GeForce NOW app.
