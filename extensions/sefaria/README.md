# Sefaria Extension for Raycast

An unofficial Raycast extension that provides access to [Sefaria.org](https://www.sefaria.org/), the free digital library of Jewish texts, through the Sefaria API.

**Note:** This extension is not affiliated with or endorsed by Sefaria. It is an independent project that uses the public Sefaria API to provide search and text retrieval functionality.

## Features

### 🔍 Search Sefaria

- Search for texts, commentaries, and sources across the entire Sefaria library
- **Search in Hebrew or English** - supports both Hebrew and English queries
- Browse results organized by category (Tanakh, Talmud, Midrash, etc.)
- View detailed source information with Hebrew and English text side by side
- **Open any result directly on Sefaria.org** for further research
- Supports searching for:
  - Biblical texts (תנ"ך / Tanakh)
  - Talmudic sources (תלמוד / Talmud)
  - Commentaries (רש"י, רמב"ן / Rashi, Ramban, etc.)
  - Any text in the Sefaria library

### 📖 Get Source

- Retrieve specific sources by reference in Hebrew or English
- Shows both Hebrew and English text side by side with proper RTL formatting
- **Direct links to view sources on Sefaria.org** for additional study
- Extract and display footnotes separately for clarity
- Supports various reference formats:
  - `Exodus 17:15` or `Exod. 17:15`
  - `Shemot 17:15` (Hebrew book names)
  - `Berakhot 14b` (Talmudic references)
  - `Rashi on Genesis 1:1` (Commentary references)

## Usage

### Search Sefaria

1. Open Raycast and type "Search Sefaria"
2. Enter your search query in **Hebrew or English** (e.g., "משה" or "Moses")
   - **Hebrew searches work great!** Try searching for "תורה", "תפילה", "משה", etc.
   - Enable Hebrew keyboard input on macOS: System Preferences → Keyboard → Input Sources
3. Browse results organized by category (Tanakh, Talmud, Midrash, etc.)
4. Select any result to view the full source with Hebrew and English text
5. Use **⌘+O** to open the source directly on Sefaria.org for further study

### Get Source

1. Open Raycast and type "Get Source"
2. Enter a specific reference (e.g., "Exodus 17:15", "ברכות י״ד", "Rashi on Genesis 1:1")
3. View the source with Hebrew and English text side by side
4. Use **⌘+O** to open the source on Sefaria.org
5. Copy Hebrew text (**⌘+H**), English text (**⌘+E**), or both (**⌘+⇧+A**)

### Keyboard Shortcuts

- **⌘+H**: Copy Hebrew text
- **⌘+E**: Copy English text
- **⌘+⇧+A**: Copy both texts
- **⌘+F**: Copy footnotes (when available)
- **⌘+O**: Open in browser
- **⌘+←**: Go back
- **⌘+↑**: Back to categories

## Installation

1. Install the extension from the Raycast Store
2. Use the commands `Search Sefaria` or `Get Source` from Raycast

## Development

```bash
# Install dependencies
pnpm install

# Start development server
pnpm run dev

# Build extension
pnpm run build

# Lint code
pnpm run lint

# Auto-fix linting issues
pnpm run fix-lint
```

## API

This extension uses the [Sefaria API](https://developers.sefaria.org/) to provide seamless access to the vast library of Jewish texts:

- **Search**: `POST /api/search-wrapper` - Full-text search across the entire Sefaria library
- **Texts**: `GET /api/v3/texts/{reference}` - Retrieve specific sources with Hebrew and English versions
- **Integration**: Direct links to [Sefaria.org](https://www.sefaria.org/) for extended research and study

The extension bridges the gap between quick reference lookup and deep textual study by providing immediate access to sources while maintaining seamless integration with the full Sefaria website experience.

## Credits

This extension was developed by **Rabbi David Nagarpowers** (`danyeric123`) as an independent project to bring Sefaria's vast library of Jewish texts to Raycast users.

### Acknowledgments

- **Sefaria** for providing the free API that powers this extension
- **Raycast** for creating an excellent platform for productivity extensions

## License

MIT
