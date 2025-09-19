# ElevenlabsWhisper

A Raycast extension that provides speech-to-text transcription using ElevenLabs' Scribe model.

## Features

### 🎙️ Audio Recording
- **Audio capture** using SoX (Sound eXchange) command-line tool
- **Live waveform visualization** with animated ASCII art during recording
- **High-quality audio**: 16kHz sample rate, 16-bit, mono WAV format
- **Smart process management**: Handles SoX process spawning and graceful termination
- **Automatic file cleanup**: Removes temporary files after transcription

### 🤖 AI Transcription
- **ElevenLabs Scribe integration**: Optimized specifically for ElevenLabs' Scribe model
- **High accuracy**: Leverages ElevenLabs' advanced speech-to-text technology
- **Direct clipboard integration**: Seamlessly copy transcribed text
- **Transcript editing**: Edit text before copying/pasting
- **Comprehensive error handling**: Robust error recovery and user feedback

### 🎯 User Experience
- **Simple workflow**: Recording auto-starts once environment checks pass
- **Intuitive controls**: Enter stops recording, Cmd+Z cancels
- **Visual feedback**: Clear state indicators and progress animations
- **Session management**: Fresh state for each recording session

## Get Started

### Prerequisites

- **macOS**: Required for SoX audio capture
- **Node.js**: For development (v16+ recommended)
- **SoX**: Install via Homebrew
  ```bash
  brew install sox
  ```

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/insv23/elevenlabswhisper.git
   cd elevenlabswhisper
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure API keys**
   - Get API keys from your preferred provider:
     - [ElevenLabs](https://elevenlabs.io/)
     - [302.ai](https://302.ai/)
   - Configure in Raycast extension preferences

4. **Run in development**
   ```bash
   npm run dev
   ```

5. **Build for production**
   ```bash
   npm run build
   ```

### Usage

1. **Open Raycast** and search for "ElevenlabsWhisper"
2. **Configure preferences** (first time only):
   - Select provider (ElevenLabs or 302.ai)
   - Enter API key
   - Configure optional settings
3. **Start recording**: Extension automatically begins recording when opened
4. **Stop recording**: Press Enter to stop and start transcription
5. **Review transcript**: Edit if needed before copying
6. **Copy or paste**: Use "Paste Edited Transcript" (pastes and copies) or "Copy Edited Transcript"

### Keyboard Shortcuts

- **Enter**: Trigger the primary action (stop and transcribe while recording)
- **Cmd+Z**: Cancel the current recording
- **Cmd+N**: Start a new recording (from transcript view)

## Project Structure

```
elevenlabswhisper/
├── src/
│   ├── transcribe.tsx              # Main Raycast command UI
│   ├── hooks/
│   │   └── transcribe/
│   │       ├── index.ts            # Hook exports
│   │       ├── types.ts            # Shared hook types
│   │       ├── useAutoStart.ts     # Auto-start recording coordination
│   │       ├── useEnvironmentGate.ts # Dependencies and preference guard
│   │       ├── useTranscribeSpinner.ts # Animated markdown spinner frames
│   │       ├── useTranscriptionToasts.ts # Toast notifications
│   │       └── useWaveformAnimation.ts # Animated waveform markdown
│   ├── services/
│   │   ├── audio.service.ts        # SoX audio recording management
│   │   ├── transcription.service.ts # API transcription services
│   │   └── storage.service.ts      # File system operations
│   ├── store/
│   │   ├── transcription.store.ts  # Zustand state + workflow orchestration
│   │   └── types.ts                # Store types and status enums
│   ├── types/
│   │   ├── index.ts                # Shared type exports
│   │   └── preferences.ts          # Preference definitions
│   └── utils/
│       ├── transcribeSpinner.ts    # Spinner frame generation
│       └── waveform.ts             # ASCII waveform generation
├── docs/
│   ├── bugs/                       # Bug documentation snapshots
│   ├── staging/                    # Staging notes and experiments
│   ├── live-audio-waveform-spectrum.md
│   └── transcribing-ascii-bubble-animation-plan.md
├── package.json                    # Project dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
└── CHANGELOG.md                    # Version history
```

### Architecture Overview

**Layered Architecture**:
1. **UI Layer** (`transcribe.tsx`): Raycast form/detail UI and user actions
2. **State & Workflow Layer** (`store/transcription.store.ts`): Zustand store coordinating recording, transcription, and cleanup
3. **Hook Layer** (`hooks/transcribe/`): Cross-cutting concerns (auto-start, environment gating, spinner/waveform animations, toasts)
4. **Service Layer** (`services/`): Infrastructure integrations (SoX, storage, provider APIs)
5. **Utility Layer** (`utils/`): Reusable helpers for waveform/spinner rendering

**Key Components**:
- **Audio Service**: Manages SoX process lifecycle with robust cleanup
- **Transcription Service**: Handles API communication with providers
- **Storage Service**: File operations and cleanup
- **Waveform Utility**: Real-time audio visualization

## Configuration

### Audio Settings
- **SoX Executable Path**: Custom SoX binary location (optional)
- **Auto-detection**: Checks common Homebrew installations and PATH

### Provider Configuration
- **Provider Selection**: ElevenLabs or 302.ai
- **Model ID**: Customizable transcription model (default: scribe_v1)
- **API Keys**: Secure authentication for selected provider

## Development

### Technologies Used
- **Raycast API**: Extension framework and UI components
- **TypeScript**: Type-safe development
- **React**: Component-based UI
- **SoX**: Audio processing and recording
- **Node.js**: Runtime environment

## Troubleshooting

### Common Issues

1. **SoX not found**: Ensure SoX is installed and available on PATH
2. **API key errors**: Verify API keys are correctly configured
3. **Recording issues**: Check microphone permissions in macOS settings
4. **Process cleanup**: Extension automatically handles SoX process termination



## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is open source and available under the MIT License.
