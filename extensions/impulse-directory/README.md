# Impulse Directory

A Raycast extension that allows you to search and discover AI prompts from the [Impulse Directory](https://impulse.directory).

## Features

- 🔍 **Search Prompts**: Search through a comprehensive collection of AI prompts
- 📂 **Categorized Content**: Browse prompts organized by categories (Coding, Writing, Design, Marketing, etc.)
- 🏷️ **Tag-Based Filtering**: Prompts are tagged for easy discovery
- 📋 **Quick Copy**: Copy prompt content directly to your clipboard
- 📝 **Detailed View**: View full prompt details with metadata
- ⚡ **Fast Search**: Throttled search with real-time results

## Installation

1. Clone this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```

## Development

To develop the extension locally:

```bash
npm run dev
```

This will start the development server and open the extension in Raycast.

## Usage

1. Open Raycast
2. Search for "Search Prompt" or use the configured hotkey
3. Type your search query to find relevant prompts
4. Browse through the results with category icons and tags
5. Select a prompt to view details or copy content

### Available Actions

- **View Prompt Details**: See the full prompt content with formatting
- **Copy Prompt Content** (`⌘C`): Copy the prompt text to clipboard
- **Copy Prompt Title** (`⌘T`): Copy just the title
- **Copy as Markdown** (`⌘⇧C`): Copy as formatted markdown

## Categories

Prompts are organized into categories with distinct icons:
- 💻 **Coding** (Blue)
- ✍️ **Writing** (Green)
- 🎨 **Design** (Purple)
- 📢 **Marketing** (Orange)
- 💡 **Other** (Yellow)

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build the extension
- `npm run lint` - Run linting
- `npm run fix-lint` - Fix linting issues
- `npm run publish` - Publish to Raycast Store

## License

MIT License - see LICENSE file for details.
