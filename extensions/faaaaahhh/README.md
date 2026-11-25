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
change the volume or unmute the computer.

If playback fails, the extension saves a timestamped error report named
`last-playback-error.txt` in its local support directory and reveals it in Finder.
Open that file to read the full error details. A HUD confirms where to find the
report. Each failure replaces the previous report. If the
report cannot be saved or revealed, an alert displays both the
playback problem and the reporting problem instead.

## Sound source

The bundled `assets/faaaaahhh.m4a` comes from
<https://www.youtube.com/watch?v=VP6eZu3SAak>
("Fahh" - meme sound effect, uploaded by Sound effects).

Leading and trailing silence have been removed for immediate hotkey playback.

The extension author has confirmed permission to redistribute the bundled audio.
The audio remains the property of its respective rights holders and is excluded
from the MIT license covering the extension source code.
