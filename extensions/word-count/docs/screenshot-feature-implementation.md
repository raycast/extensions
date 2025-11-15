# Screenshot Word Count Feature Implementation

## Overview

This document describes the implementation of the screenshot-based word counting feature for the Word Count Raycast extension. This feature allows users to capture a screenshot of any text on their screen and instantly get word, character, sentence, and paragraph counts using OCR (Optical Character Recognition).

## Architecture

### Components

1. **Swift OCR Module** (`swift/Sources/WordCount/ScreenOCR.swift`)
   - Handles screenshot capture using macOS `screencapture` utility
   - Performs OCR using Apple's Vision framework
   - Returns recognized text to TypeScript layer

2. **TypeScript Wrapper** (`src/utils.ts`)
   - `readFromScreenshot()` function bridges Swift and TypeScript
   - Handles errors gracefully
   - Returns empty string on failure

3. **Command Handler** (`src/count-screenshot.tsx`)
   - No-view mode command for instant execution
   - Captures screenshot, extracts text, counts, and displays results
   - Shows formatted results in Raycast HUD

### Data Flow

```
User triggers hotkey
    ↓
Raycast launches count-screenshot command
    ↓
Command calls readFromScreenshot()
    ↓
Swift captures screenshot area (user selects region)
    ↓
Vision framework performs OCR on captured image
    ↓
Recognized text returned to TypeScript
    ↓
count() function processes text
    ↓
Results formatted and displayed in HUD
```

## Implementation Details

### Swift OCR Function

The `recognizeTextFromScreenshot()` function:
- Uses `/usr/sbin/screencapture -i` for interactive area selection
- Supports optional camera shutter sound
- Employs Vision framework's `VNRecognizeTextRequest` for OCR
- Uses fast recognition mode for better performance
- Enables language correction for improved accuracy
- Defaults to English (en) language

### Screenshot Capture Process

1. Generates temporary PNG file path
2. Launches `screencapture` process with `-i` flag (interactive)
3. User selects screen area (or presses Esc to cancel)
4. Reads captured image from temporary file
5. Converts NSImage to CGImage for Vision processing
6. Cleans up temporary file

### OCR Processing

- Recognition level: Fast (optimized for speed)
- Language correction: Enabled
- Default language: English (en)
- Line breaks: Preserved in output
- Error handling: Returns error message string on failure

### Result Display

Results are shown in a Raycast HUD with the following format:

```
📊 Word Count Results
━━━━━━━━━━━━━━━━━━
Characters: 1,234
Words: 256
Sentences: 12
Paragraphs: 4
```

Numbers are formatted with locale-specific thousand separators.

## Requirements

### System Requirements

- **macOS 12.0+** (required by Swift Package)
- **Xcode** (required for Swift compilation)
  - Not just Command Line Tools
  - Must be set as active developer directory
  - Check with: `xcode-select -p`
  - Set with: `sudo xcode-select -s /Applications/Xcode.app/Contents/Developer`

### Dependencies

- `@raycast/api` ^1.103.6
- Swift Package: `extensions-swift-tools` from GitHub (referenced in Package.swift)

## Configuration

### User Preferences

The extension adds one optional preference:

- **Play screenshot sound**: Enable/disable camera shutter sound during capture
  - Type: Checkbox
  - Default: false (silent)
  - Accessible via Raycast extension preferences

## File Structure

```
word-count/
├── swift/
│   ├── Package.swift                    # Swift package configuration
│   └── Sources/
│       └── WordCount/
│           └── ScreenOCR.swift         # OCR implementation
├── src/
│   ├── count-screenshot.tsx            # Screenshot command handler
│   ├── utils.ts                        # TypeScript wrapper (readFromScreenshot)
│   └── lib/
│       └── count/
│           └── count.ts                # Core counting logic (reused)
└── docs/
    └── screenshot-feature-implementation.md  # This file
```

## Usage

### For Users

1. Install the Word Count extension in Raycast
2. Assign a hotkey to "Count from Screenshot" command
3. Press the hotkey
4. Select the screen area containing text
5. View results in HUD

### For Developers

#### Building

```bash
# Install dependencies
npm install

# Build extension (requires Xcode)
npm run build

# Development mode
npm run dev
```

#### Testing

The feature should be tested with:
- Various text types (English, CJK characters, mixed)
- Empty screenshots (no text)
- Cancelled captures (user presses Esc)
- Different screen resolutions and DPI settings
- Text with various fonts and sizes

## Known Limitations

1. **Xcode Requirement**: Full Xcode installation required, not just Command Line Tools
2. **macOS Only**: Swift and Vision framework are macOS-specific
3. **OCR Accuracy**: Depends on text clarity, font, and contrast
4. **Language Support**: Currently defaults to English; could be extended for multi-language
5. **Performance**: Fast mode prioritizes speed over accuracy

## Future Enhancements

Potential improvements:
- Multi-language OCR support via preferences
- Fullscreen capture option
- Copy results to clipboard action
- Save screenshot with results overlay
- Batch processing of multiple screenshots
- Custom OCR accuracy settings (fast vs. accurate)

## Troubleshooting

### Build Errors

**Error**: `xcode-select: error: tool 'xcodebuild' requires Xcode`

**Solution**: Install Xcode from Mac App Store and set it as active:
```bash
sudo xcode-select -s /Applications/Xcode.app/Contents/Developer
```

**Error**: `Cannot find module 'swift:../swift'`

**Solution**: This is expected before first build. Run `npm run build` to generate TypeScript bindings.

### Runtime Errors

**Issue**: "No text detected in screenshot"

**Possible causes**:
- Screenshot was cancelled
- Selected area contains no text
- Text is too small or blurry
- Poor contrast between text and background

**Issue**: "Failed to count text from screenshot"

**Possible causes**:
- OCR processing error
- Invalid image format
- Insufficient permissions

## References

- [Raycast Extensions Swift Tools](https://github.com/raycast/extensions-swift-tools)
- [ScreenOCR Extension](https://github.com/raycast/extensions/tree/main/extensions/screenocr)
- [Apple Vision Framework](https://developer.apple.com/documentation/vision)
- [Raycast API Documentation](https://developers.raycast.com/)

## Credits

Implementation inspired by the [ScreenOCR](https://github.com/raycast/extensions/tree/main/extensions/screenocr) Raycast extension by huzef44.
