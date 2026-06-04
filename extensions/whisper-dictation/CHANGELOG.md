 # Changelog

## [Update] - {PR_MERGE_DATE}

### Added
- New "Dictate with AI Prompt" command to select a specific prompt before dictating
- Support for single-character keyboard shortcuts on prompts
  - Assign shortcuts to your most-used prompts for faster access
  - Shortcuts are displayed as tags in the prompt list
- Create standalone Raycast script commands from prompts
  - Generate custom script commands that open dictation with a specific prompt
  - Accessible via "Create Standalone Command" action (⌘⇧C)
  - Requires setting Script Commands Path in preferences
- Launch context support for direct prompt selection via deep links
### Fixed
- Fixed an issue where if the window was closed during model download, the download would not complete and the user was not properly notified.
- Fixed an issue where the waveform would malform with certain commands and screen sizes

### Credits, thanks and a heartfelt apology:
- SHL0MS - [GitHub](https://github.com/SHL0MS)
  - Implemented and fixed most of the features, fixes and the script commands feature, apologies for not merging your PRs in a timely manner. Now that I am done with uni I have a lot more time to maintain this extension. 
- To all who submitted issues and feature requests, your feedback is much appreciated and if your request is not included in this update, it is either impossible, impractical or just not a feature I would like to have in this extension, feel free to open another issue to discuss it if closed, if still open please wait for the next update where it will most likely be included or I will get back to you.
- Again apologies for the lack of updates, I was busy with uni, now I am done and will be able to provide more frequent updates.

## [0.1.2] - 2025-07-29

### Fixed
- Fixed an issue where if the window was closed during model download, the download would not complete yet the model would still be set as active and throw an error when trying to transcribe
### Added
- Check for file size after downloading model to ensure the file is complete
  - This check is based off of known file sizes for each model with some room for error


## [0.1.1] - 2025-06-26
### Added

- Preference to both copy and paste transcribed text automatically
- Added separate commands for dictation and dictation with AI refinement
  - This gives more flexibility in how and when each command is called
- Added shortcut to skip refinement for a session during the prompt selection menu (if configured)


## [0.1.0] - 2025-06-05

 ### Added
- Initial release of **Whisper Dictation** extension
  - Local transcription using `whisper.cpp`
  - Download and manage Whisper models within Raycast
  - AI-based refinement via Raycast AI or Ollama/OpenAI-compatible APIs
  - Dictation history with browse, copy, and paste capabilities
  - Configurable default actions (paste, copy, or manual)
