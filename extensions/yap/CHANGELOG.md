# Yap Changelog

## [Hello World] - 2025-08-12

### Features

- **Tweet Posting**: Post tweets directly to X (Twitter) from Raycast
  - Real-time character counting with 280 character limit validation
  - Character count indicator with visual feedback (✅/❌)
  - Optional confirmation dialog before posting tweets

- **Feedback System**: Send feedback directly through the extension
  - Dedicated feedback form with 1000 character limit
  - Optional confirmation dialog before submitting feedback
  - Secure API integration for feedback collection

- **Security & Authentication**
  - Secure API key storage using Raycast's secure storage
  - Bearer token authentication for all API requests
  - HTTPS-only communication

- **User Experience**
  - Clean, intuitive form interface
  - Loading states during API operations
  - Comprehensive error handling with user-friendly messages
  - Success notifications with HUD feedback

### Keyboard Shortcuts

- `⌘ + Enter` - Post tweet
- `⌘ + Shift + C` - Clear content
- `⌘ + Shift + P` - Open extension preferences
- `⌘ + F` - Open feedback form

### Configuration Options

- **API Key**: Secure storage of user's API credentials
- **Confirm Before Posting**: Toggle confirmation dialog for tweets (default: enabled)
- **Confirm Before Submitting Feedback**: Toggle confirmation dialog for feedback (default: enabled)
