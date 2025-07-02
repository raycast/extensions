# PromptLayer for Raycast

Browse, search, and use your PromptLayer prompts directly from Raycast. Fill template variables with an intuitive form interface and copy the results to your clipboard instantly.

## Features

- 🔍 **Smart Search**: Find prompts quickly with Raycast's powerful search
- 🏷️ **Tag Filtering**: Filter prompts by tags using the dropdown
- 📝 **Variable Forms**: Automatically detect template variables and create forms to fill them
- 📋 **Instant Copy**: Filled prompts are automatically copied to your clipboard
- 🔒 **Secure**: Your API key is stored securely in Raycast preferences
- ⚡ **Fast**: Direct integration with PromptLayer API for real-time access

## Setup

1. Install the extension from Raycast Store
2. Get your PromptLayer API key from [PromptLayer Settings](https://promptlayer.com/settings)
3. Open the extension and enter your API key in preferences
4. Start browsing your prompts!

## Usage

1. **Browse Prompts**: Open Raycast and search for "Browse PromptLayer Prompts"
2. **Search & Filter**: Use the search bar and tag filter to find specific prompts
3. **Fill Variables**: Click on a prompt with variables to open the form
4. **Copy Result**: The filled prompt is automatically copied to your clipboard  

## Installation

### Prerequisites

- [Raycast](https://raycast.com/) installed
- PromptLayer account with API access
- Node.js 16+ and npm

### Setup

1. **Clone or create the extension directory:**
   ```bash
   mkdir -p ~/.raycast/extensions/promptlayer-filler
   cd ~/.raycast/extensions/promptlayer-filler
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Build the extension:**
   ```bash
   npm run build
   ```

4. **Configure your API key:**
   - Open Raycast
   - Search for "Browse PromptLayer Prompts"
   - Enter your PromptLayer API key in the preferences

## Usage

### Basic Usage

1. **Open Raycast** (⌘ + Space)
2. **Search for "Browse PromptLayer Prompts"**
3. **Browse your prompts** in the Spotlight-like interface

### Features in Detail

#### Search & Filter
- **Search**: Type to search by prompt name, content, tags, or description
- **Tag Filter**: Use the dropdown to filter by specific tags
- **Real-time**: Results update as you type

#### Prompt Actions
- **Enter**: Fill template (if variables exist) or copy directly
- **⌘ + D**: View detailed prompt information
- **⌘ + C**: Copy raw template without filling
- **⌘ + R**: Refresh templates from PromptLayer

#### Variable Filling
1. **Select a prompt** with variables (e.g., `{{name}}`, `{{topic}}`)
2. **Fill the form** with your desired values
3. **Submit** to interpolate and copy to clipboard
4. **Preview** with ⌘ + P to see the result before copying

#### Template Preview
- View complete prompt content
- See detected variables
- Check prompt location/folder
- View associated tags

## Configuration

### API Key Setup
1. Get your API key from [PromptLayer Dashboard](https://promptlayer.com)
2. In Raycast preferences, enter the key in "PromptLayer API Key" field

### Supported Template Syntax
- `{{variable}}` - Standard variable
- `{{{variable}}}` - Unescaped variable (HTML)
- Mustache templating features supported

## Development

### Project Structure
```
src/
├── index.tsx              # Main component with prompt list
├── types.ts              # TypeScript interfaces
├── api.ts                # PromptLayer API client
├── utils.ts              # Utility functions
└── components/
    └── VariableForm.tsx  # Form for filling variables
```

### Scripts
- `npm run dev` - Development mode
- `npm run build` - Build extension
- `npm run lint` - Lint code
- `npm run fix-lint` - Fix linting issues

### Key Dependencies
- `@raycast/api` - Raycast SDK
- `mustache` - Template rendering
- `promptlayer` - PromptLayer API client

## API Integration

The extension uses PromptLayer's REST API:
- **Endpoint**: `GET /rest/prompt-templates`
- **Authentication**: X-API-KEY header
- **Response**: Array of template objects

### Template Structure
```typescript
interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  tags?: string[];
  metadata?: {
    folder?: string;
    group?: string;
    description?: string;
  };
}
```

## Troubleshooting

### Common Issues

**"Invalid API key" error:**
- Verify your API key in Raycast preferences
- Check that your PromptLayer account has API access

**"No templates found":**
- Ensure you have templates in your PromptLayer account
- Check API key permissions

**Template rendering errors:**
- Verify variable syntax uses `{{variable}}` format
- Check for unmatched braces in templates

**Network errors:**
- Check internet connection
- Verify PromptLayer service status

### Debug Mode
Enable debug logging by setting `NODE_ENV=development` in your environment.

## Security

- API keys are stored securely in Raycast preferences
- No data is sent to external services except PromptLayer
- Template processing happens entirely locally
- No LLM calls or prompt execution via PromptLayer

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For issues and feature requests, please create an issue in the repository or contact the maintainer.
