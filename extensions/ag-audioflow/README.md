# AG AudioFlow - Professional Audio Processing Suite

<div align="center">
  <img src="assets/icon.png" alt="AG AudioFlow Logo" width="128" height="128"/>
  
  **Professional audio editing and processing extension for Raycast**
  
  Transform, enhance, and manipulate audio files with professional-grade tools directly from your command bar.
  
  [![Made with ❤️ by Adi Goldstein](https://img.shields.io/badge/Made%20with%20❤️%20by-Adi%20Goldstein-blue)](https://agsoundtrax.com)
  [![Powered by AGsoundtrax.com](https://img.shields.io/badge/Powered%20by-AGsoundtrax.com-green)](https://agsoundtrax.com)
  [![FFmpeg](https://img.shields.io/badge/Powered%20by-FFmpeg-orange)](https://ffmpeg.org)
  
</div>

---

## 🎯 About

AG AudioFlow is a comprehensive audio processing suite designed for professionals, content creators, podcasters, musicians, and anyone who works with audio files. Built by **Adi Goldstein** and powered by **[AGsoundtrax.com](https://agsoundtrax.com)**, this extension brings professional-grade audio processing capabilities directly to your macOS desktop through Raycast.

Whether you're preparing podcast episodes, mastering music tracks, converting audio formats, or processing large batches of audio files, AG AudioFlow provides the tools you need with an intuitive, fast interface.

## Features

### 🎵 Audio Format Conversion
- Convert between WAV, MP3, AAC, FLAC, OGG, and other formats
- Customizable bitrates (64k to 320k)
- Sample rate conversion (8kHz to 96kHz)
- Mono/Stereo channel conversion

### ✂️ Silence Trimming
- Automatically remove silence from the beginning and end of audio files
- Configurable silence detection thresholds
- Preserves audio quality while reducing file size

### 🎛️ Fade Effects
- Add professional fade-in effects at the beginning
- Add smooth fade-out effects at the end
- Customizable fade durations

### 📊 Audio Normalization
- Normalize audio levels using EBU R128 standard
- Multiple target loudness presets:
  - -16 LUFS (Streaming/Radio)
  - -18 LUFS (YouTube)
  - -23 LUFS (Broadcast Standard)
  - -14 LUFS (Spotify)
  - -11 LUFS (CD Master)

### 🔊 Volume/Gain Adjustment
- Precise volume control in decibels (-60dB to +60dB)
- Common presets for quick adjustments
- High-precision gain mode for subtle changes
- Custom volume values with real-time validation

### 🎚️ Stereo Processing
- **Split Stereo to Mono**: Extract separate left and right channel files
- **Stereo to Mono Conversion**: Mix stereo to mono with channel selection options
- Support for different mixing methods (mix both, left only, right only)

### ⚡ Speed Adjustment
- Variable speed control with percentage precision (10% - 1000%)
- Pitch preservation option to maintain original tone
- Common presets: half speed, double speed, 1.5x, etc.
- Perfect for lectures, music practice, or creative effects

### 📁 Batch Processing
- Process multiple audio files simultaneously
- Apply the same operations to entire folders
- Progress tracking for large batches
- Detailed success/failure reporting

### 📋 Audio File Information
- View detailed metadata for audio files
- Duration, bitrate, sample rate, channels
- File size and format information
- Copy information to clipboard

## 🚀 Quick Start

### Step 1: Install AG AudioFlow
1. Download the AG AudioFlow extension
2. Open Raycast and import the extension
3. The extension will appear in your Raycast commands

### Step 2: Install FFmpeg (Required)
AG AudioFlow requires FFmpeg for audio processing. See the [FFmpeg Installation Guide](#-ffmpeg-installation-guide) below for detailed instructions.

### Step 3: Start Processing Audio
1. Select audio files in Finder
2. Open Raycast (`⌘ + Space`)
3. Type any AG AudioFlow command
4. Follow the intuitive interface to process your audio

---

## 🔧 FFmpeg Installation Guide

### Why FFmpeg is Required

**FFmpeg** is the industry-standard multimedia framework that powers AG AudioFlow's audio processing capabilities. Here's why we need it:

#### 🎯 **What is FFmpeg?**
- **Industry Standard**: Used by Netflix, YouTube, VLC, and major media companies worldwide
- **Comprehensive**: Supports virtually every audio and video format ever created
- **High Quality**: Professional-grade encoding and decoding algorithms
- **Open Source**: Free, secure, and continuously updated by a global community
- **Cross-Platform**: Works on macOS, Windows, and Linux

#### 🛠️ **What FFmpeg Enables in AG AudioFlow:**
- **Format Conversion**: Convert between MP3, WAV, AAC, FLAC, OGG and more
- **Audio Processing**: Volume adjustment, normalization, fade effects
- **Advanced Filters**: Silence removal, speed adjustment, stereo processing
- **Metadata Handling**: Read and write audio file information
- **Batch Processing**: Efficiently process multiple files simultaneously

#### 🔒 **Security & Trust:**
- FFmpeg is open-source with publicly auditable code
- Used by Apple, Google, Microsoft, and other major tech companies
- No telemetry, ads, or data collection
- Installed locally on your machine with no cloud dependencies

---

### Installation Methods

#### 🍺 **Method 1: Homebrew (Recommended)**

Homebrew is the most popular package manager for macOS and the easiest way to install FFmpeg.

**First, install Homebrew (if not already installed):**
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

**Then install FFmpeg:**
```bash
brew install ffmpeg
```

**Verify installation:**
```bash
ffmpeg -version
```

**For Apple Silicon Macs (M1/M2/M3):**
- FFmpeg will be installed to `/opt/homebrew/bin/ffmpeg`
- This is automatically detected by AG AudioFlow

**For Intel Macs:**
- FFmpeg will be installed to `/usr/local/bin/ffmpeg`
- This is automatically detected by AG AudioFlow

---

#### 🚢 **Method 2: MacPorts**

If you prefer MacPorts over Homebrew:

**Install MacPorts** (if not already installed):
1. Download the installer from [macports.org](https://www.macports.org/install.php)
2. Run the installer package

**Install FFmpeg:**
```bash
sudo port install ffmpeg
```

**Verify installation:**
```bash
ffmpeg -version
```

---

#### 📦 **Method 3: Manual Installation**

For advanced users who prefer manual installation:

1. **Download FFmpeg:**
   - Visit [ffmpeg.org/download.html](https://ffmpeg.org/download.html)
   - Click "macOS" section
   - Download the latest stable build

2. **Extract and Install:**
   ```bash
   # Extract the downloaded archive
   tar -xzf ffmpeg-*.tar.gz
   
   # Move to applications folder
   sudo mv ffmpeg /usr/local/bin/
   
   # Make executable
   sudo chmod +x /usr/local/bin/ffmpeg
   ```

3. **Add to PATH** (if needed):
   ```bash
   echo 'export PATH="/usr/local/bin:$PATH"' >> ~/.zshrc
   source ~/.zshrc
   ```

4. **Verify installation:**
   ```bash
   ffmpeg -version
   ```

---

#### 🐳 **Method 4: Conda/Miniconda**

If you use Conda for package management:

```bash
conda install -c conda-forge ffmpeg
```

---

### Verification & Troubleshooting

#### ✅ **Verify Your Installation**

After installation, verify FFmpeg is working:

```bash
# Check version (should show FFmpeg details)
ffmpeg -version

# Check if AG AudioFlow can find it
# Run "Setup FFmpeg" command in Raycast
```

#### 🔍 **Troubleshooting Common Issues**

**Issue: "Command not found: ffmpeg"**
- Solution: FFmpeg is not in your PATH. Try restarting Terminal or add FFmpeg to PATH manually

**Issue: "Permission denied"**
- Solution: Run installation commands with `sudo` where indicated

**Issue: "AG AudioFlow says FFmpeg not installed"**
- Solution 1: Restart Terminal and try again
- Solution 2: Run the "Setup FFmpeg" command in AG AudioFlow for diagnosis
- Solution 3: Try manual PATH configuration

**Issue: "Homebrew not found"**
- Solution: Install Homebrew first using the command in Method 1

**For Apple Silicon Mac Users:**
- Ensure you're using the ARM64 version of Homebrew
- FFmpeg should install to `/opt/homebrew/bin/ffmpeg`

**For Intel Mac Users:**
- Use the standard Homebrew installation
- FFmpeg should install to `/usr/local/bin/ffmpeg`

#### 🆘 **Still Having Issues?**

1. Run the **"Setup FFmpeg"** command in AG AudioFlow for automated diagnosis
2. Check the [FFmpeg documentation](https://ffmpeg.org/documentation.html)
3. Verify your macOS version compatibility
4. Try a clean reinstallation

---

### FFmpeg Capabilities

Once installed, FFmpeg enables these professional features in AG AudioFlow:

| Feature | Description | Use Cases |
|---------|-------------|-----------|
| **Format Conversion** | Convert between 50+ audio formats | Compatibility, file size optimization |
| **Quality Control** | Adjust bitrate, sample rate, channels | Professional mastering, streaming prep |
| **Audio Enhancement** | Volume, normalization, fade effects | Podcast production, music mastering |
| **Advanced Processing** | Speed adjustment, stereo manipulation | Creative effects, audio analysis |
| **Batch Operations** | Process hundreds of files simultaneously | Large library management |
| **Metadata Handling** | Read/write ID3 tags and file info | Organization, cataloging |

---

## 🎬 Use Cases & Workflows

AG AudioFlow is designed for diverse audio processing needs. Here are some common workflows:

### 🎙️ **Podcast Production Workflow**
1. **Import Raw Recording** - Select your recorded audio file
2. **Trim Silence** - Remove dead air from start/end
3. **Normalize Audio** - Set to -16 LUFS for streaming platforms
4. **Add Fade Effects** - 2-second fade in/out for professional sound
5. **Convert Format** - Export as MP3 192kbps for distribution
6. **Batch Process** - Apply same settings to entire episode series

### 🎵 **Music Production Workflow**
1. **Format Conversion** - Convert WAV masters to distribution formats
2. **Volume Adjustment** - Fine-tune levels with precision dB control
3. **Speed Adjustment** - Create alternate tempo versions (with pitch preservation)
4. **Stereo Processing** - Split stereo for stem creation or analysis
5. **Normalization** - Master to -14 LUFS for streaming platforms
6. **Batch Export** - Generate multiple format/quality versions

### 📚 **Audiobook/Educational Content**
1. **Silence Trimming** - Clean up chapter recordings
2. **Volume Normalization** - Ensure consistent levels across chapters
3. **Speed Control** - Create 1.25x and 1.5x speed versions
4. **Format Optimization** - Balance quality vs file size for distribution
5. **Metadata Analysis** - Verify duration and technical specs

### 🎬 **Video Production Audio**
1. **Extract & Convert** - Prepare audio tracks for video editing
2. **Sync Processing** - Match audio levels across multiple clips
3. **Stereo to Mono** - Create center channel for dialogue
4. **Background Processing** - Optimize music tracks for background use

---

## 📚 Command Reference

### 🎵 **Convert Audio Format**
**Purpose**: Transform audio files between different formats with quality control

**Supported Formats**: MP3, WAV, AAC, FLAC, OGG  
**Quality Options**: Bitrate (64k-320k), Sample Rate (8kHz-96kHz), Channels (Mono/Stereo)

**Best Practices**:
- Use 320kbps MP3 for archival quality
- Use 192kbps MP3 for web/streaming
- Use WAV for professional editing
- Use AAC for Apple ecosystem compatibility

---

### ✂️ **Trim Silence**
**Purpose**: Remove unwanted silence from audio beginnings and endings

**Parameters**: 
- Start Threshold: -50dB (adjustable)
- End Threshold: -50dB (adjustable)

**Pro Tips**:
- Use -60dB for very quiet recordings
- Use -30dB for noisy environments
- Perfect for cleaning up voice recordings

---

### 🎛️ **Add Fade Effects**
**Purpose**: Create smooth transitions with professional fade in/out effects

**Options**:
- Fade In Duration: 0-60 seconds
- Fade Out Duration: 0-60 seconds
- Can use one or both effects

**Common Durations**:
- **Radio/Podcast**: 2-3 seconds
- **Music**: 3-5 seconds
- **Cinematic**: 5-10 seconds

---

### 📊 **Normalize Audio**
**Purpose**: Standardize audio levels using professional loudness standards

**Target Levels**:
- **-16 LUFS**: Streaming platforms (Spotify, Apple Music)
- **-18 LUFS**: YouTube, social media
- **-23 LUFS**: Broadcast television standard
- **-14 LUFS**: Spotify "Loud" setting
- **-11 LUFS**: CD mastering reference

---

### 🔊 **Adjust Volume/Gain**
**Purpose**: Precise volume control with professional dB scaling

**Range**: -60dB to +60dB  
**Modes**: 
- Standard volume adjustment
- High-precision gain mode

**Guidelines**:
- **+6dB**: Doubles perceived loudness
- **-6dB**: Halves perceived loudness  
- **+3dB**: Noticeable increase
- **-3dB**: Noticeable decrease

---

### 🎚️ **Split Stereo to Mono**
**Purpose**: Extract left and right channels as separate mono files

**Output**: Creates `filename_left.ext` and `filename_right.ext`

**Use Cases**:
- Isolate instruments from stereo recordings
- Create stems for remixing
- Audio analysis and troubleshooting
- Prepare tracks for specific playback systems

---

### 🔄 **Convert Stereo to Mono**
**Purpose**: Combine stereo channels into single mono file

**Methods**:
- **Mix Both**: Combines L+R channels (recommended)
- **Left Only**: Uses only left channel
- **Right Only**: Uses only right channel

**Benefits**:
- Reduces file size by ~50%
- Compatible with mono playback systems
- Simplifies certain audio workflows

---

### ⚡ **Adjust Audio Speed**
**Purpose**: Change playback speed with optional pitch preservation

**Range**: 10% - 1000% (0.1x - 10x speed)  
**Pitch Modes**:
- **Preserve Pitch**: Maintains original tone (recommended)
- **Natural Speed**: Classic speed change with pitch shift

**Common Uses**:
- **50%**: Slow for transcription
- **125%**: Slightly faster podcasts
- **150%**: Fast learning/review
- **200%**: Double-speed playback

---

### 📁 **Batch Audio Processing**
**Purpose**: Apply any operation to multiple files simultaneously

**Supported Operations**: All individual commands  
**Features**:
- Progress tracking
- Error handling
- Organized output naming
- Success/failure reporting

**Workflow**:
1. Select multiple files in Finder
2. Choose operation and settings
3. Specify output directory
4. Monitor progress in real-time

---

### 📋 **Audio File Info**
**Purpose**: Analyze audio file technical specifications

**Information Provided**:
- Duration and file size
- Format and codec details
- Bitrate and sample rate
- Channel configuration
- Metadata and tags

**Professional Uses**:
- Quality control verification
- Technical specification documentation
- Troubleshooting audio issues
- Archive cataloging

---

### 🔧 **Setup FFmpeg**
**Purpose**: Verify FFmpeg installation and get setup assistance

**Features**:
- Automatic installation detection
- Step-by-step setup guide
- Copy-paste installation commands
- Troubleshooting assistance

**Status Indicators**:
- ✅ FFmpeg Ready - All systems operational
- ❌ FFmpeg Required - Installation needed

---

## Installation

1. Clone or download this extension
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Import into Raycast

## Usage

### Quick Start
1. **Select Audio Files**: Select one or more audio files in Finder
2. **Open Raycast**: Press your Raycast hotkey
3. **Choose Command**: Type the name of the audio editing operation:
   - "Convert Audio Format"
   - "Trim Silence"
   - "Add Fade Effects"
   - "Normalize Audio"
   - "Adjust Volume/Gain"
   - "Split Stereo to Mono"
   - "Convert Stereo to Mono"
   - "Adjust Audio Speed"
   - "Batch Audio Processing"
   - "Audio File Info"

### Individual Commands

#### Convert Audio Format
- Automatically detects selected audio files
- Choose output format, bitrate, and quality settings
- Preserves original files, creates new converted versions

#### Trim Silence
- Removes silence from start and end of audio files
- Adjust threshold settings for different audio types
- Great for cleaning up recordings and podcasts

#### Add Fade Effects
- Add professional fade-in and fade-out effects
- Specify custom durations for each effect
- Perfect for music production and audio editing

#### Normalize Audio
- Ensure consistent volume levels across files
- Choose from industry-standard loudness targets
- Essential for podcast production and music mastering

#### Adjust Volume/Gain
- Increase or decrease audio volume with precise dB control
- Choose from common adjustment presets or enter custom values
- High-precision gain mode for professional audio work
- Range: -60dB to +60dB with input validation

#### Split Stereo to Mono
- Extract left and right channels as separate mono files
- Automatically creates [filename]_left.ext and [filename]_right.ext
- Perfect for isolating instruments or analyzing stereo recordings
- Requires stereo (2-channel) input files

#### Convert Stereo to Mono
- Convert stereo audio to single mono channel
- Choose mixing method: mix both channels, left only, or right only
- Reduces file size while maintaining audio content
- Useful for speech, podcasts, or mono-compatible systems

#### Adjust Audio Speed
- Change playback speed from 10% to 1000% with precision control
- Pitch preservation option maintains original tone quality
- Common presets for quick adjustments (half speed, double speed, etc.)
- Perfect for learning, transcription, or creative audio effects

#### Batch Processing
- Select multiple files and apply the same operation
- Choose output directory for organized results
- Real-time progress tracking
- Detailed completion reports

#### Audio File Info
- View comprehensive metadata for selected files
- Copy information to clipboard for documentation
- Support for multiple file analysis

## Tips & Best Practices

1. **File Selection**: Always select your audio files in Finder before running commands
2. **Output Directories**: Specify custom output directories to keep files organized
3. **Backup Originals**: Original files are never modified - new files are created with descriptive suffixes
4. **Batch Processing**: Use batch processing for consistent results across multiple files
5. **Quality Settings**: Higher bitrates result in better quality but larger file sizes
6. **Normalization**: Use -23 LUFS for broadcast content, -14 to -16 LUFS for streaming platforms

## Supported File Formats

**Input Formats:**
- MP3, WAV, AAC, FLAC, OGG, M4A, WMA

**Output Formats:**
- MP3, WAV, AAC, FLAC, OGG

## Troubleshooting

### "FFmpeg Not Available" Error
- Ensure FFmpeg is installed: `ffmpeg -version`
- Check that FFmpeg is in your system PATH
- Restart Raycast after installing FFmpeg

### "No Audio Files Selected" Error
- Select audio files in Finder before running commands
- Ensure selected files have supported audio extensions
- Try refreshing the command if files were recently selected

### Conversion Failures
- Check that input files are not corrupted
- Ensure sufficient disk space for output files
- Verify write permissions for output directories

## Development

### Build Commands
- `npm run dev` - Development mode with hot reload
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run fix-lint` - Fix ESLint issues

### Project Structure
```
src/
├── utils/
│   └── audioProcessor.ts    # Core audio processing utilities
├── types.ts                 # TypeScript type definitions
├── convert-audio.tsx        # Audio format conversion command
├── trim-silence.tsx         # Silence trimming command
├── add-fade.tsx            # Fade effects command
├── normalize-audio.tsx     # Audio normalization command
├── adjust-volume.tsx       # Volume/gain adjustment command
├── split-stereo.tsx        # Stereo splitting command
├── stereo-to-mono.tsx      # Stereo to mono conversion command
├── adjust-speed.tsx        # Speed adjustment command
├── batch-process.tsx       # Batch processing command
└── audio-info.tsx          # Audio information command
```

## License

MIT License - feel free to modify and distribute as needed.

## Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

## Changelog

### v1.0.0 - Initial Release
- ✅ **11 Professional Audio Commands** - Complete audio processing suite
- 🎵 **Format Conversion** - Support for MP3, WAV, AAC, FLAC, OGG with quality control
- ✂️ **Audio Enhancement** - Silence trimming, fade effects, volume adjustment
- 📊 **Professional Tools** - Audio normalization using EBU R128 standards
- 🎚️ **Stereo Processing** - Split stereo to mono, stereo-to-mono conversion
- ⚡ **Speed Control** - Variable speed with pitch preservation (10%-1000%)
- 📁 **Batch Processing** - Process multiple files with any operation
- 📋 **File Analysis** - Detailed audio metadata and information display
- 🔧 **Smart FFmpeg Detection** - Automatic path detection for all Mac configurations
- 🎨 **Professional UI** - Custom logo and intuitive interface design

---

## 👨‍💻 Creator & Support

**AG AudioFlow** is created with ❤️ by **Adi Goldstein**

### 🌐 **Connect & Learn More:**
- **Website**: [AGsoundtrax.com](https://agsoundtrax.com) - Professional audio services and tools
- **Portfolio**: Explore more audio tools and services
- **Support**: Technical support and feature requests

### 🎵 **About AGsoundtrax.com:**
AGsoundtrax.com is a professional audio services platform specializing in:
- Audio post-production and mastering
- Custom audio tool development
- Sound design and music production
- Audio technology consulting

AG AudioFlow represents our commitment to bringing professional audio tools to everyday users, making advanced audio processing accessible through intuitive interfaces.

---

## 🤝 Contributing & Feedback

We welcome contributions, feedback, and feature requests!

### **How to Contribute:**
1. Fork the repository
2. Create a feature branch
3. Submit a pull request with detailed description

### **Feature Requests:**
- Open an issue with your feature request
- Describe your use case and expected behavior
- We prioritize features that benefit the audio community

### **Bug Reports:**
- Use the "Setup FFmpeg" command for diagnostic information
- Include your macOS version and FFmpeg version
- Describe steps to reproduce the issue

---

## 📄 License

MIT License - Free to use, modify, and distribute.

```
Copyright (c) 2024 Adi Goldstein / AGsoundtrax.com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 🙏 Acknowledgments

- **FFmpeg Team** - For creating the world's best multimedia framework
- **Raycast Team** - For building an incredible platform for productivity extensions
- **Open Source Community** - For the tools and libraries that make this possible
- **Audio Professionals** - For feedback and feature suggestions that shaped this tool

**AG AudioFlow** - Where professional audio processing meets everyday productivity.

*Made with ❤️ by [Adi Goldstein](https://agsoundtrax.com) | Powered by [AGsoundtrax.com](https://agsoundtrax.com)*