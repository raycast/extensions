<p align="center">
  <img src="assets/extension-icon.png" width="128" alt="OpenRouter Models Raycast Extension Logo">
</p>

# OpenRouter Models - Raycast Extension

> **Note:** This project is not affiliated with OpenRouter in any way. It was created by [@mikedemarais](https://github.com/mikedemarais) as a personal tool after frequently refreshing the OpenRouter website to check for new models.

Browse and search 300+ AI models available on OpenRouter directly from Raycast, providing quick access to model details and IDs for your AI applications.

## Features

- **Model Discovery**: Instantly search and filter through the complete OpenRouter model catalog
- **Time-based Categorization**: View recently added models by timeframe (Today, This Week, etc.)
- **Convenient Actions**: Copy model IDs with a single click or view full documentation
- **Sorting Options**: Sort by newest, context length, or price

## Screenshots

### Browse Recently Added OpenRouter Models
Search through 300+ AI models available on OpenRouter
![Browse Recently Added OpenRouter Models](metadata/screenshot1.png)

### Search Recently Added OpenRouter Models
Search through 300+ AI models available on OpenRouter
![Search Recently Added OpenRouter Models](metadata/screenshot2.png)

### Sort by Various Parameters
Sort models by newest, context length, or price
![Sort by Various Parameters](metadata/screenshot3.png)

### Quick Model Actions
Easily copy model IDs or view documentation
![Quick Model Actions](metadata/screenshot4.png)

## Installation

1. Install [Raycast](https://raycast.com/) if you haven't already
2. In Raycast, go to Store and search for "OpenRouter Models"
3. Click Install

## Usage

1. Launch Raycast (default: ⌘+Space)
2. Type "OpenRouter Models"
3. Browse or search the model catalog:
   - Filter models via the search bar
   - Sort using the dropdown menu (Newest, Context Length, Price)
   - Models are grouped by timeframe when sorting by Newest
4. Select a model to see details and options:
   - Copy the model ID for use in your code
   - Open the model's page on OpenRouter website

## Configuration

In Raycast preferences, you can set the default action when selecting a model:
- Copy Model ID (default)
- Open Model Page

## Development

This extension uses:
- TypeScript & React
- Raycast Extensions API
- OpenRouter API for model data

```bash
# Clone repository
git clone https://github.com/mikedemarais/raycast-openrouter

# Install dependencies
npm install

# Start development server
npm run dev
```

## About OpenRouter

[OpenRouter](https://openrouter.ai) provides unified access to 300+ AI models from various providers through a standardized API, similar to OpenAI's. Pricing is transparent with per-token costs, and models vary in capabilities, context lengths, and specializations.

This extension is an unofficial tool and is not endorsed by or affiliated with OpenRouter.

## License

MIT License
