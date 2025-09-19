# LGTM Pusher

Generate awesome LGTM (Looks Good To Me) images instantly with AI-powered creativity for your code reviews and GitHub PRs!

## Features

- **AI-Powered Generation**: Uses Google Gemini AI to create unique 8-bit pixel art LGTM images
- **Multiple Generation Modes**: 
  - **Simple mode** with presets or custom prompts
  - **Template mode** for structured generation with customizable elements
  - **Style reference** mode for consistent aesthetics
  - **Fallback mode** for offline generation
- **Instant Clipboard Copy**: Generated images are automatically copied to your clipboard
- **Customizable Text**: Add custom text overlays to your images (default: "LGTM")
- **Multiple Presets**: Choose from various preset styles:
  - Pixel Heart Boy (8-bit character with heart)
  - Pixel Galaxy (cosmic fantasy style)
  - Pixel Office (programmer workspace)
  - Pixel Cat Programmer (cute coding cat)
  - Pixel Celebration (colorful party mood)
- **Auto-fallback**: Automatically generates gradient background when API fails

## Installation

### From Raycast Store

1. Open Raycast
2. Search for "LGTM Pusher" in the Store
3. Click Install

### Manual Installation

1. Clone this repository
2. Run `npm install`
3. Run `npm run build`
4. Open the extension in Raycast

## Setup

Before using LGTM Pusher, you need to obtain a Google Gemini API key:

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Get API Key"
4. Copy your API key
5. Open LGTM Pusher preferences in Raycast
6. Paste your API key in the "Gemini API Key" field

## Usage

### Generate LGTM Command (View Mode)

1. Open Raycast and search for "Generate LGTM"
2. Choose your generation settings:
   - **Prompt Mode**: Simple (presets) or Template (structured)
   - **Mode**: Prompt Only, Style Reference, Edit, or Fallback
   - **Text Overlay**: Custom text to display (default: "LGTM")
   - **Font Size**: Small, Medium, or Large
   - **Image Size**: 512x512 or 1024x1024
3. Press Enter to generate and copy to clipboard

### Quick LGTM Command (No-View Mode)

- Set up a hotkey (recommended: ⌘⇧L)
- Instantly generates with your last used settings
- Perfect for rapid code review responses

## Generation Modes

### Simple Mode
- Select from preset styles or write custom prompts
- Perfect for quick, creative generations
- Automatically includes LGTM text requirements

### Template Mode
Structured generation with specific parameters:
- **Logo Type**: Type of logo to create
- **Font Style**: Text styling (geometric, bold, etc.)
- **Main Element**: Primary visual element (karaage, cat, space, office)
- **Color Scheme**: Color palette selection

## Technical Details

### Generation Policy

Background image requirements:
- 8-bit pixel art aesthetic
- Central 40% reserved for text overlay
- No watermarks, logos, or UI elements
- High contrast for text readability

### Error Handling

| Issue | Solution |
|-------|----------|
| API key invalid | Generate new key at AI Studio |
| Rate limit exceeded | Wait a few seconds or use fallback mode |
| Text not readable | Adjust font size and regenerate |

### Technology Stack

- **Framework**: Raycast Extension (TypeScript/React)
- **AI Model**: Google Gemini 2.5 Flash
- **Image Processing**: Jimp for text overlay
- **Node.js**: v20+ recommended

## Keyboard Shortcuts

- `⌘ + Enter`: Generate and copy image
- `⌘ + O`: Open generated image
- `⌘ + C`: Copy to clipboard again

## Development

```bash
# Development mode
npm run dev

# Build extension
npm run build

# Lint code
npm run lint

# Fix lint issues
npm run lint --fix
```

## Privacy & Security

- Your API key is stored securely in Raycast's preferences
- Images are generated locally and temporarily stored
- No data is collected or shared with third parties

## Support

For issues, feature requests, or contributions, please visit our [GitHub repository](https://github.com/YuminosukeSato/lgtm-pusher).

## Future Ideas

- Image history and regeneration
- Prompt template saving/sharing
- Variable aspect ratios (16:9, etc.)
- Negative prompt UI
- Batch generation mode

## License

MIT License - see LICENSE file for details

---

Made with ❤️ for developers who appreciate good code reviews!