# Media Converter

A powerful and user-friendly media conversion tool that allows you to easily convert between various video, audio, and image formats using FFmpeg.

## Features

- **Multi-Format Support**:
  - Video: MP4, AVI, MKV, MOV, MPG, WEBM
  - Image: JPG, PNG, WebP, HEIC, TIFF
  - Audio: MP3, AAC, WAV, FLAC

- **Two Conversion Modes**:
  1. **Standard Conversion**: Select multiple files and convert them in batch
  2. **Quick Convert**: Convert files directly from Finder selections

- **Quality Preservation**: High-quality conversion that maintains original file quality
- **Smart File Naming**: Automatically handles file naming conflicts
- **User-Friendly Interface**: Simple one-click conversion process
- **Automatic FFmpeg Management**: Handles FFmpeg installation if not present

## Requirements

- FFmpeg 

## Usage

### Standard Conversion
1. Open Raycast and search for "Convert Media"
2. Select one or more files of the same type (video, image, or audio)
3. Choose your desired output format
4. Click Convert or press ⌘↵

### Quick Convert
1. Select a file in Finder
2. Open Raycast and search for "Quick Convert"
3. Choose your desired output format from the list
4. The converted file will be saved in the same directory

## Supported Formats

### Video
- Input/Output: .mov, .mp4, .avi, .mkv, .mpg, .m4v, .webm
- Video Codecs: H.264, XVID, ProRes, H.265, MPEG-2

### Image
- Input/Output: .jpg, .jpeg, .png, .webp, .gif, .bmp, .tiff, .heic
- High-quality conversion using native macOS APIs

### Audio
- Input/Output: .mp3, .aac, .wav, .flac, .m4a, .ogg, .wma
- High-quality audio codecs for each format

## License

MIT

## Author

leandro.maia