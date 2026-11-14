# TypeWhisper

Control [TypeWhisper](https://www.typewhisper.com) directly from Raycast - start dictation, browse transcription history, manage profiles, and transcribe audio files.

## Prerequisites

- [TypeWhisper](https://www.typewhisper.com) must be installed and running on your Mac
- The API server must be enabled in TypeWhisper: **Settings > Advanced > Enable API Server**

## Commands

| Command                     | Description                                                             |
| --------------------------- | ----------------------------------------------------------------------- |
| **Start Dictation**         | Start or stop voice dictation with a single keystroke                   |
| **Dictate with Workflow**   | Start a dictation that uses a specific workflow                         |
| **Show Last Transcription** | Copy the most recent transcription to your clipboard                    |
| **Search History**          | Browse and search your transcription history                            |
| **Transcribe File**         | Transcribe an audio file (WAV, MP3, M4A, FLAC, OGG, AAC, MP4, WebM)     |
| **Toggle Recording**        | Start or stop a recording, for example of a meeting                     |
| **Show Last Recording**     | Show and copy the transcript of the last recording started from Raycast |
| **Add Dictionary Term**     | Add the selected text or a typed word to the dictionary                 |
| **Manage Dictionary**       | Browse, add, edit, and delete dictionary terms and corrections          |
| **Manage Workflows**        | Enable or disable workflows and start a dictation with one              |
| **Switch Model**            | Choose the transcription engine and model                               |

## Configuration

The extension finds TypeWhisper's API port and API token automatically, so it also works when **Require API Token** is turned on. If you use a custom port, set it in the extension preferences under **API Port Override**.
