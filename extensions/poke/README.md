# Poke for Raycast

A Raycast extension to send messages to Poke programmatically.

## Features

- Send messages to Poke directly from Raycast
- Secure API key storage in preferences
- Simple, seamless interface

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Get your Poke API key from [https://poke.com/settings/advanced](https://poke.com/settings/advanced)

3. Open Raycast preferences and configure the extension:
   - Go to Extensions → Poke
   - Enter your API key in the preferences

4. Use the extension:
   - Open Raycast
   - Type "Send Message to Poke"
   - Enter your message and press Enter (or Cmd+Enter)

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Lint
npm run lint
```

## API Reference

This extension uses the Poke API endpoint:
- **URL**: `https://poke.com/api/v1/inbound-sms/webhook`
- **Method**: POST
- **Headers**: 
  - `Authorization: Bearer {API_KEY}`
  - `Content-Type: application/json`
- **Body**: `{ "message": "your message" }`

For more information, visit [https://interaction.co/mcp](https://interaction.co/mcp)






