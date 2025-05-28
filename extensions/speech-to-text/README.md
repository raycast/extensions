# Speech to Text

A Raycast extension that allows you to convert speech to text using Groq's API.

## Features

- Record audio directly from Raycast
- Select existing audio files for transcription
- Transcribe audio to text using Groq's powerful speech-to-text models
- Copy transcription results to clipboard
- View and search transcription history

## Requirements

- [Sox](https://sox.sourceforge.net/) - Sound processing program
  - Install with Homebrew: `brew install sox`
- [Groq API Key](https://console.groq.com/) - For accessing Groq's speech-to-text models

## Setup

1. Install the extension in Raycast
2. Get a Groq API key from [console.groq.com](https://console.groq.com/)
3. Enter your API key in the extension preferences
4. Select your preferred transcription model

## Usage

1. Open Raycast and search for "Speech to Text"
2. Choose to record a new audio or select an existing file
3. If recording, speak into your microphone
4. Wait for the transcription to complete
5. The transcription will be copied to your clipboard automatically

## Transcription History

The extension maintains a history of your transcriptions:

- View all previous transcription sessions in a searchable list
- See details including date, duration, file size, and word count
- Re-transcribe previous recordings with different settings
- Copy transcriptions to clipboard
- Delete or show audio files in Finder
- Filter and search through your transcription history

### Using Transcription History

1. Access "Transcription History" from Raycast search
2. Browse your past recordings with details like date, duration, and word count
3. Search for recordings from the transcribed content
4. Select a transcription to view its full text
5. Use actions to:
   - Copy the transcription to clipboard
   - Re-transcribe with different settings (model, language, etc.)
   - Show the audio file in Finder
   - Delete the recording and its transcription

## Models

The extension supports the following Groq speech-to-text models:

- **Whisper Large v3** - High accuracy, suitable for most transcription needs
- **Whisper Large v3 Turbo** - Faster processing with good accuracy
- **Distil Whisper** - Lightweight English model with faster processing

## Customization Options

You can customize the transcription process through the extension preferences:

- **API Key**: Your Groq API key for authentication
- **Model**: Select your preferred transcription model
- **Language**: Choose from multiple languages or auto-detection
- **Custom Prompts**: Add specific instructions to improve transcription accuracy
- **Specialized Terms**: List domain-specific terms or names for better recognition
- **Context Awareness**: Enable to use highlighted text as context

## Troubleshooting

- If you encounter issues with recording, make sure Sox is installed: `brew install sox`
- Ensure your microphone permissions are enabled for Raycast
- Check your Groq API key is valid and has access to the speech-to-text models
- If transcription fails, try a different model or check your internet connection

## Privacy Note

Audio recordings are stored locally in a dedicated directory managed by Raycast. You can manage or delete these recordings through the Transcription History feature.
