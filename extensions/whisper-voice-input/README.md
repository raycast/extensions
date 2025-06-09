# Whisper Voice Input

A Raycast extension that records audio, transcribes it using whisper-cpp, and pastes the transcribed text back into your active application.

> ⚠️ **Requirements:**
> - macOS operating system
> - [Raycast](https://www.raycast.com/) installed
> - Homebrew package manager

## Features

- Record audio for a specified duration
- Transcribe audio using OpenAI's Whisper model via whisper-cpp
- Support for multiple languages
- Automatic UTF-8 encoding handling
- Seamless integration with Raycast
- One-click paste functionality

## Installation

### Option 1: Install from Raycast Store (Coming Soon)
1. Open Raycast
2. Go to Extensions
3. Search for "Whisper Voice Input"
4. Click Install

### Option 2: Manual Installation
1. Install [Raycast](https://www.raycast.com/) if you haven't already
2. Install required dependencies via Homebrew:
```bash
brew install ffmpeg whisper-cpp terminal-notifier cliclick
```

3. Download the Whisper model:
```bash
mkdir -p ~/whisper-models
# Choose one of the following models:
# Small model (1GB) - Faster, less accurate
curl -L -o ~/whisper-models/ggml-small.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-small.bin

# Medium model (1.5GB) - Balanced speed and accuracy (default)
curl -L -o ~/whisper-models/ggml-medium.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-medium.bin

# Large model (3GB) - Slower, more accurate
curl -L -o ~/whisper-models/ggml-large.bin \
  https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-large.bin
```

4. Clone this repository:
```bash
git clone https://github.com/yourusername/whisper-voice-input.git
cd whisper-voice-input
```

5. Install dependencies:
```bash
npm install
```

6. Build the extension:
```bash
npm run build
```

7. Load the extension in Raycast:
   - Open Raycast
   - Go to Extensions
   - Click the "+" button
   - Select "Import Extension"
   - Choose the `dist` directory from this project

8. Grant Accessibility permissions for Raycast (required for cliclick & AppleScript)

## Usage

1. Open Raycast
2. Search for "Whisper Voice Input"
3. Press Enter to start recording
4. The script will:
   - Record audio for the specified duration
   - Transcribe the audio using whisper-cpp
   - Paste the transcribed text back into your active application

## Configuration

The script supports the following parameters:
- `-d`: Recording duration in seconds (default: 5)
- `-l`: Language code (default: "zh")
- `-m`: Path to model file (default: "~/whisper-models/ggml-medium.bin")
- `-t`: Temporary directory
- `-s`: Sender bundle ID

Example configurations:
```bash
# Use small model
./whisper-voice-input.sh -m ~/whisper-models/ggml-small.bin

# Use large model with 10-second recording
./whisper-voice-input.sh -m ~/whisper-models/ggml-large.bin -d 10

# Use medium model with English language
./whisper-voice-input.sh -m ~/whisper-models/ggml-medium.bin -l en
```

## Development

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Start development mode:
```bash
npm run dev
```

4. Make changes to the code
5. Test your changes in Raycast

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

The MIT License is a permissive license that is short and to the point. It lets people do anything they want with your code as long as they provide attribution back to you and don't hold you liable.

Key features of the MIT License:
- Commercial use
- Modification
- Distribution
- Private use

For more information about the MIT License, visit [choosealicense.com/licenses/mit/](https://choosealicense.com/licenses/mit/). 