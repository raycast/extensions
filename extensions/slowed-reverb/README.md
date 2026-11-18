<div align="center">
  <img src="./media/extension_icon.png" alt="Slowed + Reverb icon" width="100"/>
  <h3>Slowed + Reverb</h3>
  <p>Slow down, speed up, and add reverb to local audio</p>
</div>

Slowed + Reverb is a Raycast extension for making slowed, reverb, and nightcore edits on macOS and Windows. Use it to process a batch, change tempo while keeping the original pitch, or convert files to MP3, WAV, or FLAC. SoX processes the audio locally and saves new copies beside the originals or in a folder you choose.

## Install SoX

**macOS**

```sh
brew install sox
```

**Windows**

```powershell
winget install --id ChrisBagwell.SoX -e
```

Restart Raycast after installing SoX. The extension checks your PATH and common install locations, including the WinGet links directory. If it can't find SoX, set **SoX Executable Path** in the extension preferences to the full path to `sox` or `sox.exe`. You can also install SoX directly. [SoX downloads](https://sourceforge.net/projects/sox/files/sox/)

## Process audio

Open **Process Audio**, pick one or more files, and choose a preset and output format. Leave **Output Folder** empty to save each result beside its source. The results list shows what was saved, where it went, and any files SoX could not read or process. Open a result, reveal it in Finder or File Explorer, or copy its path.

| Preset             | What it does                                                                         |
| ------------------ | ------------------------------------------------------------------------------------ |
| Slowed + Reverb    | Lowers speed and pitch and adds reverb. Defaults to 0.8× speed and 50% reverberance. |
| Slowed             | Lowers speed and pitch. Defaults to 0.8×.                                            |
| Reverb             | Adds room sound at the original speed. Defaults to 50% reverberance.                 |
| Nightcore          | Raises speed and pitch. Defaults to 1.2×.                                            |
| Tempo (Keep Pitch) | Changes speed while keeping the original pitch.                                      |
| Format Only        | Saves the audio in a different format without applying effects.                      |

Use a speed from 0.5× to 2×. Where reverb is available, set its amount from 0% to 100%.

The four **Generate** commands run their presets directly on the selected audio files in Finder on macOS. On Windows, or when there's no audio selected in Finder, they open the file picker with the preset selected. Set the default slowed speed, nightcore speed, and output format in Raycast's extension preferences.

Output filenames include the preset. If a name is already taken, the extension adds a number, such as `demo-slowed-2.wav`.

## File formats

- **Input.** WAV, FLAC, AIFF, Ogg Vorbis, and MP3 are supported when your SoX build includes the corresponding decoder. The picker also accepts M4A, AAC, and MP4, which require a SoX build that can read them.
- **Output.** Choose MP3, WAV, or FLAC. MP3 is the default on macOS and WAV is the default on Windows. MP3 output needs an MP3 encoder in your SoX installation. If SoX reports that it cannot load LAME, choose WAV or FLAC for the output.
- **Troubleshooting.** If SoX can't decode a file, export it as WAV from your audio app and use that file as the input. Run `sox --help` to see the formats in your SoX build.

## Raycast AI

With Raycast Pro, mention `@slowed-reverb` in AI Chat and include the file's full path. **Inspect Audio** reads the format, duration, sample rate, and channel count. **Render Audio** shows the files and settings for confirmation before creating new copies. SoX processes the audio locally.

- `@slowed-reverb How long is /Users/me/Music/demo.wav, and what sample rate does it use?`
- `@slowed-reverb Slow /Users/me/Music/demo.wav to 80% speed, keep the pitch, and save it as FLAC.`
- `@slowed-reverb Add 65% reverb to C:\Music\demo.wav and save it as WAV.`
