# Raycast Citation Generator

Generate properly formatted academic citations in various styles (APA, MLA, Chicago, Harvard) from URLs or manual entry.

## Features

- **Create Citations from URLs**: Automatically extract citation information from webpages.
- **AI-Powered Extraction**: Uses AI to accurately extract citation details when available (requires Raycast Pro).
- **Manual Entry**: Create citations manually with a comprehensive form.
- **Multiple Citation Styles**: Format citations in APA (7th Ed.), MLA (9th Ed.), Chicago (17th Ed.), or Harvard style.
- **Citation Management**: View, search, copy, and modify your saved citations.
- **One-Click Copy**: Copy citations to clipboard with a single click.

## Commands

### Create Citation
Generate a new citation from a URL or manual entry.

1. Choose between "From URL" or "Manual Entry"
2. If using URL:
   - Enter the webpage URL
   - The extension will extract information automatically
   - Review and edit the extracted information
3. If using manual entry:
   - Fill in all relevant citation fields
4. Preview the formatted citation
5. Create the citation

### Past Citations
View and manage your saved citations.

- Browse all your saved citations
- Search by title, author, or content
- View detailed information for each citation
- Copy citations to clipboard
- Change citation styles
- Delete citations you no longer need

## Preferences

- **Default Citation Style**: Choose your preferred citation style for new citations (APA, MLA, Chicago, Harvard).

## Tips for Best Results

- **URL Extraction**: For best results with URL extraction, use URLs from academic sources, journal websites, or news sites that include proper metadata.
- **Additional Authors**: When adding multiple authors manually, use the format "First Last; First Last" with semicolons between authors.
- **DOI**: For academic papers, including the DOI (Digital Object Identifier) will improve citation accuracy and generate more complete citations.

## Requirements

- Raycast v1.50.0 or higher
- For AI-powered extraction: Raycast Pro subscription

## Installation

### From Raycast Store
1. Open Raycast
2. Search for "Citation Generator"
3. Click "Install"

### Manual Installation
1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start development
4. Run `npm run publish` to publish to Raycast Store