# AI Prompts Library - Raycast Extension

A searchable library of AI prompts for Raycast, featuring over 14,000 curated prompts organized by category.

## Features

- 🔍 **Fast Search**: Instantly search through thousands of prompts
- 📁 **Categorized**: Auto-categorized into Development, Marketing, Writing, Research, Design, Business, and General
- 📋 **Copy to Clipboard**: Quickly copy any prompt with one action
- 📝 **Paste to App**: Directly paste prompts into your active application
- 🎨 **Color-Coded**: Visual category indicators for easy browsing
- ⚡ **Dropdown Filter**: Filter prompts by category using the search bar dropdown

## Installation & Setup

### 1. Fix npm Permissions (if needed)

If you encounter permission errors during installation, run:

```bash
sudo chown -R $(whoami) "/Users/$(whoami)/.npm"
```

### 2. Install Dependencies

```bash
cd /Users/tpanos/Desktop/Builds/raycast-extension
npm install
```

### 3. Development Mode

Run the extension in development mode:

```bash
npm run dev
```

This will start the extension with hot-reloading enabled. Open Raycast and search for "Search AI Prompts" to test it.

### 4. Build for Production

```bash
npm run build
```

## Project Structure

```
raycast-extension/
├── package.json              # Extension configuration
├── tsconfig.json            # TypeScript config
├── prompt_library.csv       # Source data (14,000+ prompts)
├── assets/
│   └── command-icon.png     # Extension icon
└── src/
    ├── index.tsx            # Main component
    ├── types/
    │   └── index.ts         # Type definitions
    └── utils/
        ├── loadPrompts.ts   # CSV parser
        └── categorize.ts    # Auto-categorization logic
```

## How It Works

### Categorization

Prompts are automatically categorized based on keywords in their name and content:

- **Development**: Code, programming, debugging, APIs
- **Marketing**: SEO, campaigns, content marketing, social media
- **Writing**: Emails, blogs, articles, copywriting
- **Research**: Analysis, studies, data, academic
- **Design**: UI/UX, websites, interfaces, graphics
- **Business**: Meetings, company, management, sales
- **General**: Everything else

### Actions

Each prompt has two primary actions:

1. **Paste to Active App** (⌘↩): Pastes the prompt directly into your currently active application. Falls back to clipboard copy if paste fails.

2. **Copy to Clipboard** (⌘⇧C): Copies the prompt text to your clipboard.

3. **View Full Prompt** (⌘P): Opens a detailed view to read the complete prompt text.

## Usage

1. Open Raycast (⌘Space)
2. Type "Search AI Prompts" and press Enter
3. Use the search bar to find prompts by name or content
4. Use the category dropdown to filter by type
5. Select a prompt and choose an action:
   - Press ⌘↩ to paste into active app
   - Press ⌘⇧C to copy to clipboard
   - Press ⌘P to view full details

## Data Source

The extension reads from `prompt_library.csv` containing:
- **Name**: The prompt title/name
- **Prompt**: The full prompt text

The CSV file contains ~14,000 prompts and is parsed on extension load.

## Customization

### Adding New Categories

Edit `src/types/index.ts` to add new categories:

```typescript
export enum Category {
  // ... existing categories
  YourNewCategory = "your-category",
}
```

Then update the categorization logic in `src/utils/categorize.ts`.

### Modifying Keywords

Edit the `categoryKeywords` object in `src/utils/categorize.ts` to adjust how prompts are categorized.

## Troubleshooting

### Extension not appearing in Raycast
- Make sure `npm run dev` is running
- Check the terminal for any error messages
- Try restarting Raycast

### Prompts not loading
- Verify `prompt_library.csv` exists in the root directory
- Check the CSV format (should have "Name" and "Prompt" columns)
- Look for error toasts in Raycast

### Paste action not working
- Some apps don't support programmatic pasting
- The extension will automatically fall back to copying to clipboard
- You can then manually paste with ⌘V

## Development

### Commands

- `npm run dev` - Start development mode
- `npm run build` - Build for production
- `npm run lint` - Run linter
- `npm run fix-lint` - Fix lint issues

## License

MIT
