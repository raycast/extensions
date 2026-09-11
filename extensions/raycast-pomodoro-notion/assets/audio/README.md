# Bundled audio

Place audio files in this folder with the names below. PomoNotion Raycast Extension detects and uses them automatically.

## Recommended file names

- `rain-ambient.mp3`
  - Rain ambience during work
  - Natural sound with occasional distant thunder
- `break-piano.mp3`
  - Calm piano music during breaks
  - Suitable for looping
- `alarm-bell.mp3`
  - Short bell when a session ends

## Currently bundled

- `rain-ambient.mp3`
  - Source: [Pixabay - Nature copyright free rain sounds](https://pixabay.com/sound-effects/nature-copyright-free-rain-sounds-331497/)
- `break-piano.mp3`
  - Source: [Pixabay - Musical the last piano](https://pixabay.com/sound-effects/musical-the-last-piano-112677/)
- `alarm-bell.mp3`
  - Source: [Pixabay - Film special effects bell fx](https://pixabay.com/sound-effects/film-special-effects-bell-fx-410608/)

## Priority

1. User-selected files in Raycast Preferences
2. Bundled audio in this folder
3. Alarm only: macOS system sound fallback

## Notes

- Playback uses `afplay`
- Avoid extremely large files for long loops
- For non-mp3 formats, specify files explicitly in Preferences
