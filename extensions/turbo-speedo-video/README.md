# Turbo Speedo Video

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Raycast](https://img.shields.io/badge/Raycast-Extension-blue)](https://raycast.com)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-007808?logo=ffmpeg&logoColor=white)](https://ffmpeg.org)
[![Node.js](https://img.shields.io/badge/Node.js-43853D?logo=node.js&logoColor=white)](https://nodejs.org/)

A Raycast extension to adjust video playback speed using FFmpeg. Speed up or slow down your videos with ease!

## Features

- **Speed Range**: Adjust video speed from 0.25x to 40x
- **Smart Audio Handling**: Automatically adjusts audio speed for optimal quality
- **Multiple Formats**: Supports MP4, MOV, AVI, MKV, WebM, FLV, WMV, M4V, 3GP, OGV
- **Easy to Use**: Simple dropdown interface with clear speed options
- **Fast Processing**: Powered by FFmpeg for reliable video processing

## Requirements

- **FFmpeg**: Must be installed on your system
  - Install via Homebrew: `brew install ffmpeg`
  - Or download from [ffmpeg.org](https://ffmpeg.org/download.html)

## Usage

1. Open Raycast (`Cmd + Space`)
2. Type "Adjust Video Speed"
3. Select your video file
4. Choose your desired speed multiplier (0.25x - 40x)
5. Set your output path
6. Press Enter to process!

## Speed Options

- **0.25x - 2x**: Full audio quality maintained
- **2.5x - 40x**: Audio speed adjusted for optimal playback

## Installation

This extension will be available in the Raycast Store once published.

## Development

```bash
# Install dependencies
npm install

# Build the extension
npm run build

# Run tests
npm test

# Publish to Raycast Store
npm run publish
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Please see our [Security Policy](SECURITY.md) for information about reporting security vulnerabilities.

## Roadmap

- [ ] Batch processing multiple videos
- [ ] Custom speed presets
- [ ] Progress indicators for long operations
- [ ] Video preview before processing
- [ ] Support for more video formats

## Troubleshooting

### Common Issues

**FFmpeg not found**
- Make sure FFmpeg is installed: `brew install ffmpeg`
- Verify installation: `ffmpeg -version`

**Permission denied errors**
- Check file permissions for input/output directories
- Ensure Raycast has necessary permissions

**Processing fails**
- Verify video file is not corrupted
- Check available disk space
- Try with a smaller video file first

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for a list of changes and version history.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- [Raycast](https://raycast.com) for the amazing platform
- [FFmpeg](https://ffmpeg.org) for powerful video processing
- The open source community for inspiration and support