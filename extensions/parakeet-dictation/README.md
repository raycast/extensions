# Parakeet Dictation for Raycast

Offline voice-to-text dictation using NVIDIA's Parakeet model, optimized for Apple Silicon Macs.

## Features

- 🎙️ **Offline transcription** - No internet required, complete privacy
- ⚡ **Fast performance** - Optimized for Apple Silicon (M1/M2/M3)
- 🎯 **Auto-paste** - Automatically pastes transcribed text at cursor
- 🌍 **Multi-language** - Supports 25 European languages
- 🔧 **Easy setup** - Built-in dependency checker with installation guide

## Requirements

- **Apple Silicon Mac** (M1, M2, M3 or later)
- **Python 3.8+**
- **Parakeet MLX** - Installed via pip
- **SoX** or **FFmpeg** - For audio recording

## Installation

### 1. Install Parakeet MLX

**Recommended method (using pipx):**
```bash
# Install pipx if not already installed
brew install pipx

# Install parakeet-mlx
pipx install parakeet-mlx
```

**Alternative (using pip):**
```bash
pip install parakeet-mlx
```

### 2. Install Audio Recording Tool

Choose one:

**Option A: SoX (Recommended)**
```bash
brew install sox
```

**Option B: FFmpeg**
```bash
brew install ffmpeg
```

### 3. Install Extension

Install this extension from Raycast Store or run in development mode:

```bash
npm install && npm run dev
```

## Usage

1. **Start Dictation**: Run `Start Dictation` command from Raycast
2. **Speak**: The recording indicator will show - speak your text
3. **Stop**: Press `Enter` to stop recording
4. **Auto-paste**: Text is automatically transcribed and pasted at your cursor

### Setup Check

Run `Setup Dependencies` command to verify all requirements are installed.

## Configuration

Access preferences via Raycast settings:

- **Max Recording Duration**: Maximum length of recordings (default: 10 minutes)
- **Audio Quality**: Sample rate (16kHz recommended)
- **Decoding Method**: Greedy (fast) or Beam (accurate)
- **Auto-capitalize**: Automatically capitalize sentences
- **Auto-punctuation**: Add punctuation automatically
- **Progress Bar**: Show progress for long transcriptions

## Performance

On Apple Silicon (M3):
- 1 minute audio: ~5-10 seconds transcription
- 5 minute audio: ~20-30 seconds transcription
- Completely offline, no API calls

## Troubleshooting

### "Parakeet not found"
Install with: `pipx install parakeet-mlx` (recommended) or `pip install parakeet-mlx`

### "No audio recording tool found"
Install SoX: `brew install sox` or FFmpeg: `brew install ffmpeg`

### "Microphone access denied"
Grant microphone permissions in System Settings > Privacy & Security > Microphone

### Model download taking long
First transcription downloads the ~600MB Parakeet model. This only happens once.

## Language Support

Supports 25 European languages including:
- English, Spanish, French, German, Italian
- Portuguese, Dutch, Polish, Russian
- And 16 more languages

## Privacy

All transcription happens locally on your Mac. No audio or text is sent to external servers.

## License

MIT

## Credits

- Built on [NVIDIA Parakeet TDT](https://parakeettdt.com/)
- Uses [MLX Framework](https://ml-explore.github.io/mlx/) for Apple Silicon optimization
