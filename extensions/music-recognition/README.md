# Music Recognition

Recognize the song currently playing around you from Raycast using a macOS Shortcut powered by the native **Recognize Music (Shazam)** action.

## How It Works

- Raycast provides the UI and actions.
- A macOS Shortcut named `RaycastShazam-v1.1` performs the recognition.
- The Shortcut writes a JSON result to the Clipboard.
- The extension reads that result and displays the song details.

## Requirements

- macOS (Shortcuts app available)
- A Shortcut named `RaycastShazam-v1.1`

## First Launch (Onboarding)

On the first launch, the command checks whether the `RaycastShazam-v1.1` Shortcut is installed.

If the Shortcut is missing, the command shows a **Setup Required** screen and offers:

- `Install Shortcut`
- `Recheck Shortcut`
- `Open Shortcuts App`

### Recommended Install Flow (First Launch)

1. Run the `Identify Song` command in Raycast.
2. If you see **Setup Required**, choose one of these paths:
3. Choose `Install Shortcut` to import the bundled Shortcut.
4. In Shortcuts.app, confirm the import and keep the name `RaycastShazam-v1.1`.
5. Return to Raycast and run the `Identify Song` command.
6. Permission to read the clipboard will be requested (only once).
7. Start recognition.

## Using the Command

1. Run `Identify Song`
2. Wait while the Shortcut performs recognition
3. Review the result (title, artist)
4. Use built-in actions to:

- Open in Apple Music / Shazam
- Search on Spotify / Apple Music / YouTube / YouTube Music
- Copy song info

## Troubleshooting

- `Setup Required` keeps showing:
  Ensure the Shortcut is named exactly `RaycastShazam-v1.1`, then run `Recheck Shortcut`.
- No result after running:
  Reinstall the bundled Shortcut and confirm it still copies JSON text to the Clipboard as described above.
- No match:
  Try again with louder audio and less background noise.
