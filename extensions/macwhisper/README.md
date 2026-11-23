# MacWhisper for Raycast

Transcribe audio and video files on-device with [MacWhisper](https://goodsnooze.gumroad.com/l/macwhisper) straight from Raycast: subtitles and their translation, meeting notes, chapters, AI summaries, folder watching, export presets, model switching, and Raycast AI tools.

The extension is a thin wrapper around the `mw` command-line tool that ships with MacWhisper (15.11+).

## Requirements

- macOS
- MacWhisper 15.11 or later, with at least one downloaded model
- The `mw` CLI, found automatically at `/usr/local/bin/mw` or inside `MacWhisper.app` wherever it is installed (override it in the preferences)

MacWhisper does not need to be open: `mw` starts it on demand (a few seconds on the first call) and leaves it running.

## Commands

### Transcribe

| Command                         | Description                                                                                                                                                                                                           |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Transcribe File**             | Pick files (the Finder selection is filled in), choose model, language, format (txt, srt, vtt, json, csv, md, html, avid), speaker detection and timestamps, then copy, paste or save the transcript.                 |
| **Transcribe Finder Selection** | Transcribe the audio/video files selected in Finder and copy the transcript.                                                                                                                                          |
| **Transcribe Latest Recording** | Transcribe the newest audio/video file in your recording folders.                                                                                                                                                     |
| **Batch Transcribe Folder**     | Transcribe a whole folder (optionally recursive) into transcript or subtitle files, then browse the results with a preview. The folder open or selected in Finder is filled in.                                       |
| **Watch Folder**                | Background command: once started, new recordings added to a folder get a transcript next to them (checked every 10 minutes; existing files are left alone and MacWhisper is only called when there is something new). |

### Outputs

| Command                 | Description                                                                                                                                                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Summarize Recording** | Transcribe, then let Raycast AI write a summary, key points and decisions, action items, a translation, a follow-up email, YouTube chapters with a description, or answer a custom prompt. Choose the answer language and the AI model. |
| **Generate Subtitles**  | SRT or VTT files next to the videos selected in Finder (format, line length and overwrite are command preferences).                                                                                                                     |
| **Translate Subtitles** | Generate subtitles, translate the text with Raycast AI and keep every timecode, then save `name.<language>.srt`.                                                                                                                        |
| **Export Presets**      | Saved export settings (format, style, grouping, speakers, timestamps, line length, Avid fps). Ships with presets for subtitles, meeting notes, timestamped text and Avid.                                                               |

### Models

| Command           | Description                                                   |
| ----------------- | ------------------------------------------------------------- |
| **Manage Models** | List downloaded models and switch the active one.             |
| **Active Model**  | Menu bar item showing the active model, with quick switching. |

## Raycast AI

Mention `@macwhisper` in Raycast AI:

- `@macwhisper transcribe ~/Downloads/interview.m4a`
- `@macwhisper summarize my latest recording`
- `@macwhisper who said what in the recording I selected in Finder?`
- `@macwhisper make French subtitles for ~/Movies/clip.mp4 and save them next to it`
- `@macwhisper which models do I have? Switch to Whisper Large v3 Turbo`

| Tool                     | Description                                                                                                                              |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `transcribe-audio`       | Transcribe a file (or the Finder selection), optionally as subtitles, grouped by speaker, or written to a file. Asks before overwriting. |
| `list-recent-recordings` | Newest audio/video files in your recording folders.                                                                                      |
| `list-models`            | Downloaded models, the active model and the MacWhisper version.                                                                          |
| `select-model`           | Change the active model. Asks for confirmation.                                                                                          |

## Preferences

- **Default Language**: spoken language used by default. Auto-detect out of the box.
- **Recording Folders**: folders searched for your latest recording (default `~/Downloads, ~/Desktop, ~/Movies, ~/Documents/Zoom`).
- **History**: also save transcriptions to MacWhisper's history (`--persist`).
- **mw CLI Path**: custom path to `mw`.

## Development

```bash
npm install
npm run dev
```
