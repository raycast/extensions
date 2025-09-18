# Brief - Send Links with AI Summary

A Raycast extension for [Brief](https://github.com/densign01/quickcapture) - capture and email article summaries with AI.

## Features

- 📱 **Quick Capture**: Type "Brief" in Raycast to capture the current browser tab
- 🧠 **AI Summaries**: Choose between short (3-bullet) or long (6-bullet) AI-generated summaries
- ⚙️ **Configurable**: Set your email, API endpoint, and preferences
- 🌐 **Multi-browser Support**: Works with Safari, Chrome, Edge, and Arc

## Installation

### Prerequisites
- [Raycast](https://raycast.com) installed on your Mac
- Node.js 16+ installed

### Install Extension

1. **Clone this repository:**
   ```bash
   git clone https://github.com/densign01/quickcapture.git
   cd quickcapture/raycast-extension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Install in Raycast:**
   ```bash
   npm run dev
   ```

4. **Configure settings:**
   - Open Raycast preferences
   - Find "Brief" extension
   - Set your email address
   - Optionally customize API endpoint and defaults

## Usage

1. Open any article in your browser (Safari, Chrome, Edge, or Arc)
2. Open Raycast (`⌘ + Space`)
3. Type "Brief"
4. Press Enter
5. Choose your preferred option:
   - **Send with AI Summary** (uses your default length)
   - **Send without AI Summary**
   - **Send Short Summary** (3 bullets)
   - **Send Long Summary** (6 bullets)

The article will be emailed to you with professional formatting and optional AI summary.

## Configuration

The extension can be configured in Raycast preferences:

- **Email Address**: Where to send captured articles
- **API Endpoint**: Brief API URL (defaults to hosted version)
- **Enable AI Summary by Default**: Auto-enable AI summaries
- **Default Summary Length**: Choose short or long summaries

## Development

To work on the extension:

```bash
npm run dev    # Start development mode
npm run build  # Build for distribution
npm run lint   # Check code quality
```

## About Brief

Brief is a tool for capturing web articles and sending them via email with AI-generated summaries. The Raycast extension provides quick access to Brief's functionality directly from your Mac.

- **Main Project**: [github.com/densign01/quickcapture](https://github.com/densign01/quickcapture)
- **Browser Extension**: Available for Chrome, Safari, and other browsers
- **API**: Powered by Cloudflare Workers with Anthropic AI

## License

MIT License - see [LICENSE](../LICENSE) file for details.