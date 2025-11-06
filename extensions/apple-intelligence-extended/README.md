# Apple Intelligence Extended

Enhanced Apple Intelligence extension for Raycast with multilingual compose prompts and custom writing tools.

## Features

### 🌍 Multilingual Compose Prompts

Quickly compose text in multiple languages with predefined prompts:

- **Portuguese (Portugal)** - Write in Portuguese Portugal
- **Spanish** - Write in Spanish
- **French** - Write in French
- **German (Austria)** - Write in German Austria
- **Italian** - Write in Italian

Each language variant automatically opens Apple Intelligence Compose with the appropriate prompt, making it easy to generate content in different languages.

### 📝 All Standard Writing Tools

Access all Apple Intelligence Writing Tools directly from Raycast:

**On-Device Processing:**
- Proofread
- Rewrite
- Make Friendly
- Make Professional
- Make Concise

**Private Cloud Compute:**
- Summarize
- Create Key Points
- Make List
- Make Table

**OpenAI:**
- Compose (with ChatGPT)

### ⚡ Quick Access

- **List Writing Tools**: View all available writing tools in one organized list
- **Pin & Reorder**: Customize your workflow by pinning favorite tools
- **Keyboard Shortcuts**: Assign hotkeys to any command for instant access

### 🎯 Localization Support

Works with non-English macOS installations through configurable menu localization preferences.

## Installation

1. Install the extension from the Raycast Store
2. Configure localization preferences if needed (Edit menu name, Writing Tools name)
3. Assign keyboard shortcuts to your favorite commands

## Usage

### Direct Commands

Search for any writing tool in Raycast:
- "Compose in Portuguese"
- "Summarize"
- "Make Professional"

### List View

Use "List Writing Tools" to see all available commands with:
- Visual indicators for local vs. server processing
- Pin functionality for quick access
- Reorderable pinned items

## Adding Custom Prompts

The extension is designed to be easily extensible. Prompts are configured in `src/compose-prompts.ts`, making it simple to add new language variants or custom compose prompts.

## Attribution

This extension is built on top of the original [Apple Intelligence extension for Raycast](https://www.raycast.com/extensions/apple-intelligence), developed by the Raycast community. We've extended it with:

- Multilingual compose functionality with configurable prompts
- Enhanced command structure for easy extensibility
- Configuration-based prompt system

Special thanks to the original authors for creating the foundation that made these enhancements possible.

## Requirements

- macOS Sequoia 15.1 or later
- Apple Intelligence enabled on your Mac
- Raycast

## License

MIT

## Development

Built with ❤️ by [BauDevs](https://github.com/baudevs)

### Contributing

To add a new language:

1. Add entry to `COMPOSE_PROMPTS` in `src/compose-prompts.ts`
2. Create command file (e.g., `src/compose-in-[language].ts`)
3. Update `Command.ts` enums
4. Add to `package.json` commands
5. Add to `list-writing-tools.tsx`

---

**Note**: This is an independent extension that enhances the functionality of Apple Intelligence integration with Raycast. It is not officially affiliated with Apple or Raycast.