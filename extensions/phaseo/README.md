# Phaseo Raycast Extension

The Phaseo extension brings Phaseo into Raycast. Its first command lets you
explore the AI model catalogue directly from your launcher.

## Features

- **Browse Models**: Search Phaseo's catalogue by model, organisation, or endpoint
- **Organisation logos**: See the same organisation logos used in the Phaseo web app
- **Open Model Page**: Press Enter to open the canonical Phaseo model page
- **Copy Model ID**: Use Raycast's native Copy shortcut on the selected row

## Setup

1. Install the extension in Raycast
2. Get your API key from [Phaseo](https://phaseo.app)
3. Configure the model browser with your Phaseo API key in preferences

## Development

```bash
# From this directory
pnpm install
pnpm run dev
pnpm run build
pnpm run lint
```

On first run, Raycast prompts each user for their own Phaseo API key. It is
stored as a Raycast password preference and is sent only as the Bearer token
for requests to the configured Phaseo API URL.

## Requirements

- Raycast (macOS or Windows)
- Phaseo API key
- Internet connection

## License

MIT
