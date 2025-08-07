# Yap - Tweet Posting Extension

Quickly post tweets to X (Twitter) directly from Raycast.

## Setup

Before using this extension, you'll need to configure your API credentials:

### 1. Get Your API Key

You'll need to obtain an API key from your tweet posting service. This extension expects your service to provide:

- An API endpoint for posting tweets
- Bearer token authentication
- Standard HTTP POST requests with JSON payloads

### 2. Configure Extension Preferences

1. Open Raycast and search for "Yap"
2. Press `⌘ + ,` or use the "Open Extension Preferences" action
3. Fill in the required fields:
   - **API Key**: Your service's API key (stored securely)
   - **API URL**: The base URL for your tweet posting service (e.g., `https://api.yourservice.com`)
   - **Confirm Before Posting**: Whether to show a confirmation dialog before posting (optional)

## Usage

1. Open Raycast and search for "Yap"
2. Type your tweet content in the text area
3. Press `Enter` or click "Post Tweet" to publish

### Features

- **Real-time character counting** - Shows remaining characters out of 280
- **Character limit validation** - Prevents posting tweets that are too long
- **Confirmation dialog** - Optional confirmation before posting (configurable)
- **Clear content shortcut** - Press `⌘ + K` to clear the text area
- **Quick preferences access** - Press `⌘ + ,` to open preferences

### Keyboard Shortcuts

- `⌘ + Enter` - Post tweet
- `⌘ + K` - Clear content
- `⌘ + ,` - Open extension preferences

## API Requirements

Your tweet posting service should accept requests in the following format:

```http
POST /tweet
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
User-Agent: Raycast Yap Extension

{
  "content": "Your tweet content here",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

### Expected Responses

- **Success**: HTTP 200/201 with optional JSON response
- **Authentication Error**: HTTP 401 with error message
- **Rate Limiting**: HTTP 429 with error message
- **Other Errors**: HTTP 4xx/5xx with error message

## Security

- API keys are stored securely using Raycast's secure storage
- All requests use HTTPS
- No data is logged or transmitted to third parties

## Troubleshooting

### "API Key Required" Error

This means you haven't configured your API key yet. Click "Open Extension Preferences" to set it up.

### "Invalid API key" Error

Your API key may be incorrect or expired. Check your service dashboard and update the key in preferences.

### "Rate limit exceeded" Error

You've made too many requests. Wait a moment and try again.

### Connection Errors

- Verify your API URL is correct
- Check your internet connection
- Ensure your service is running and accessible

## Support

If you encounter issues:

1. Check the extension preferences are correctly configured
2. Verify your API service is working with other tools
3. Check the Raycast console for detailed error messages

For extension-specific issues, please check the Raycast extension repository or contact the extension developer.
