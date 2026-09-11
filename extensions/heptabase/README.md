# Heptabase

Connect to Heptabase via MCP to manage your knowledge base directly from Raycast.

## Features

- **Search Heptabase** - Semantic search across cards, PDFs, journals, and highlights
- **Search Whiteboards** - Find whiteboards by keywords and browse their contents
- **Append to Journal** - Quickly add content to today's journal
- **Save to Note Card** - Create new cards in your knowledge base
- **Get Journal Range** - Retrieve journal entries within a date range
- **Review Journals** - Weekly/monthly review of journal entries for reflection

## Setup

This extension uses OAuth to connect to your Heptabase account. On first use:

1. Run any command
2. You'll be redirected to Heptabase to authorize the extension
3. Grant permission and you're ready to go

### Optional: Space ID

To enable "Open in Heptabase" links, add your Space ID in extension preferences:

1. Open Raycast Preferences → Extensions → Heptabase
2. Enter your Space ID (found in the URL: `https://app.heptabase.com/{spaceId}/...`)

## Usage Tips

- **Comma-separated search**: Search multiple terms by separating with commas
- **Filter by type**: Use the dropdown to filter search results by card, journal, PDF, etc.
- **PDF viewing**: PDFs must be opened in Heptabase first to be parsed

## Author

Created by ARui