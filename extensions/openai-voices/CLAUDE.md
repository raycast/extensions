# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Raycast extension that provides text-to-speech functionality using OpenAI's TTS API. The extension allows users to read selected text or clipboard content using various OpenAI voices and models.

## Development Commands

- **Build**: `npm run build` or `ray build`
- **Development**: `npm run dev` or `ray develop` (hot-reloading development mode)
- **Linting**: `npm run lint` or `ray lint`
- **Fix Linting**: `npm run fix-lint` or `ray lint --fix`
- **Install Dependencies**: `npm install`
- **Publish**: `npm run publish` (publishes to Raycast Store)

## Architecture

### Core Components

- **`src/read-selected-text.tsx`**: Direct reading command (no-view mode) for instant hotkey usage. Automatically reads selected text or clipboard without confirmation.

- **`src/read-text-editor.tsx`**: Interactive text editor command that allows users to review and edit text before reading aloud.

- **`src/useTTS.ts`**: Custom hook that manages OpenAI TTS API integration. Uses React.useMemo for client caching, includes speed bounds checking, proper error handling, and internal loading state management.

- **`src/tts-utils.ts`**: Shared utility function for core TTS speech creation logic. Contains the consolidated `createSpeech` function used by both the hook and direct command to eliminate code duplication.

- **`src/play.ts`**: Audio playback module with streaming-first strategy:
  - **Primary**: Streaming playback using OpenAI's `playAudio` helper for real-time audio start
  - **Fallback**: File-based playback using macOS `afplay`
  - Cached ffplay availability checking for performance
  - Robust cleanup with retry logic for temporary files
  - Native format support with WAV default for optimal streaming

- **`src/onboarding.tsx`**: Simple onboarding view that guides users to configure their OpenAI API key.

### Data Flow

**Direct Reading (read-selected-text):**
1. Command executes immediately, fetches selected text or clipboard
2. Validates text and configuration, shows toast notifications
3. Closes main window and starts TTS generation
4. Plays audio and shows completion status

**Editor Mode (read-text-editor):**
1. Loads selected text or clipboard into editable form
2. User reviews/edits text and submits
3. Generates speech and plays audio
4. Returns to main interface

**Audio Processing (with Streaming):**
1. `useTTS` hook validates preferences, creates cached OpenAI client, and manages loading state
2. Both hook and direct command use shared `createSpeech()` utility from `tts-utils.ts`
3. Text is sent to OpenAI TTS API with speed bounds checking and preference validation
4. **Format handling**: Uses user-selected format with WAV as default for optimal streaming performance
5. Audio response is handled by `play()` function which:
   - **Prioritizes streaming playback** using OpenAI's `playAudio` helper for real-time audio start
   - Falls back to reliable file-based `afplay` method if streaming unavailable
   - Optionally saves files to `~/.cache/raycast-openai-voices/`

### Configuration System

The extension uses Raycast's preference system defined in `package.json`:
- **OpenAI API Key** (required): User's OpenAI API key
- **Model**: TTS model selection (gpt-4o-mini-tts, tts-1-hd, tts-1)
- **Voice**: Voice selection from 11 available options
- **Speed**: Playback speed (0.25-4.0, default 1.5)
- **Instructions**: Custom speech instructions for tone/accent
- **Response Format**: Audio format (WAV default, MP3, AAC, FLAC)
- **Save Audio Files**: Option to persist generated audio files

### Error Handling

- Missing API key validation in `useTTS` and `tts-utils`
- Loading state management within the `useTTS` hook for better UX
- Audio playback fallback mechanism in `play()`
- User feedback via Toast notifications
- Comprehensive error logging for debugging

## Technology Stack

- **Runtime**: Raycast extension environment
- **Language**: TypeScript with React JSX
- **API**: OpenAI SDK v4 for TTS functionality
- **Audio**: Native macOS `afplay` and optional `ffplay`
- **Build**: Raycast CLI (`ray`) with standard ESLint config

## File Structure

```
src/
├── read-selected-text.tsx    # Direct reading command (no-view)
├── read-text-editor.tsx      # Interactive text editor command
├── useTTS.ts                # OpenAI TTS hook with caching and loading state
├── tts-utils.ts             # Shared TTS utility functions
├── play.ts                  # Audio playback with fallbacks
└── onboarding.tsx           # User setup guide
```

## Testing

No automated test suite is configured. Testing should be done through Raycast development mode (`npm run dev`) with manual verification of:
- Text selection and clipboard reading
- TTS generation with different models/voices
- Audio playback on macOS
- Error handling scenarios

## FFPlay Setup and Troubleshooting

### The Problem
OpenAI's `playAudio` helper requires `ffplay` to be available in the system PATH for streaming audio playback. However, GUI applications like Raycast don't inherit the terminal's PATH configuration from `.zshrc` or `.bash_profile`, so they use a limited default system PATH that typically excludes Homebrew's `/opt/homebrew/bin` directory.

### Symptoms
- Console shows "ffplay for streaming playback is: not available"
- Error: `spawn ffplay ENOENT` when attempting streaming playback
- Extension falls back to file-based playback even when `ffplay` is installed via Homebrew

### Solution
Two-part fix implemented in `src/play.ts`:

1. **System-level symlink** (one-time setup):
   ```bash
   sudo ln -s /opt/homebrew/bin/ffplay /usr/local/bin/ffplay
   ```
   This creates a symbolic link in `/usr/local/bin` (which is in the default system PATH) pointing to the Homebrew-installed `ffplay`.

2. **Runtime PATH management** (code-level fix):
   ```typescript
   function ensureFFmpegInPath(): string {
     const currentPath = process.env.PATH || ''
     const requiredPaths = ['/usr/local/bin', '/opt/homebrew/bin']
     
     const pathEntries = currentPath.split(':')
     const missingPaths = requiredPaths.filter((path) => !pathEntries.includes(path))
     
     if (missingPaths.length === 0) {
       return currentPath
     }
     
     return [...missingPaths, currentPath].join(':')
   }
   ```
   
   The PATH is temporarily modified only during `playAudio` calls:
   ```typescript
   // Temporarily set PATH for OpenAI's playAudio helper
   const originalPath = process.env.PATH
   process.env.PATH = ensureFFmpegInPath()
   
   try {
     await playAudio(audio)
   } finally {
     process.env.PATH = originalPath
   }
   ```

### Key Learnings
- GUI applications on macOS have different PATH environments than terminal sessions
- OpenAI's SDK spawns `ffplay` without the full path, relying on PATH resolution
- The symlink approach is the most reliable long-term solution
- Runtime PATH management should be isolated and temporary to avoid side effects
- Smart PATH deduplication prevents PATH pollution from repeated calls
- Both detection logic and actual spawning must use consistent PATH handling