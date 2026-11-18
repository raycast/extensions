# Faaaaahhh

A macOS Raycast extension that plays the Faaaaahhh meme sound with a global
hotkey. Playback works offline and does not open a command view.

[Listen to the audio preview](media/faaaaahhh-preview.mp4).

## Usage

After installing the extension from the Raycast Store:

1. Open **Raycast Settings > Extensions** and find **Play Faaaaahhh**.
2. Click its **Hotkey** field and record an unused shortcut, for example
   **Control + Option + Command + F**. Raycast owns global hotkey assignments;
   extensions cannot assign them automatically.
3. Press the shortcut from any app while Raycast is running. You can also search
   for **Play Faaaaahhh** in Raycast and run it directly.

Playback uses the current macOS output device and system volume. It does not
change the volume or unmute the computer. Playback failures appear in a HUD;
details are available through Raycast's **Show Extension Logs** command.

## Sound source

The bundled `assets/faaaaahhh.m4a` comes from
<https://www.youtube.com/watch?v=VP6eZu3SAak>
("Fahh" - meme sound effect, uploaded by Sound effects).

Leading and trailing silence have been removed for immediate hotkey playback.

The extension author has confirmed permission to redistribute the bundled audio.
The audio remains the property of its respective rights holders and is excluded
from the MIT license covering the extension source code.

## Development

Requires macOS, Raycast, and Node.js 22.22.2 or newer.

Run `npm ci` and then `npm run dev` in this directory to import the extension into
Raycast and watch for source changes. After the first successful build, you can
stop the watcher with Control+C; the installed command remains available.

- `npm test` checks playback lifecycle, safe argument handling, and error feedback.
- `npm run typecheck` checks TypeScript.
- `npm run lint` validates Raycast metadata, the icon, formatting, and source.
- `npm run build` creates a production build in `dist/`.
