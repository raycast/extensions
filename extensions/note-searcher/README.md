# Note Searcher

A Raycast extension that allows you to save and search notes using semantic vector search powered by Upstash Vector.

## Features

- **Add Notes**: Quickly save text or URLs as notes directly from Raycast
- **Semantic Search**: Find your notes with powerful vector-based semantic search
- **URL Support**: Input containing URLs will automatically be saved as URL notes

## Usage

### Adding Notes

1. Type `Add Note` in Raycast and press Enter
2. Enter your text or URL after the command
   - For plain text: `add note > Flight number TK568234`
   - For URLs: `add note > https://upstash.com/blog/build-your-own-mcp`
3. A success notification will appear once the note is saved

### Searching Notes

1. Type `Search Note` in Raycast and press Enter
2. Enter your search query in the search bar
3. Relevant notes will be displayed in the results list
4. You can:
   - Copy the note content to clipboard by selecting it
   - Open URLs directly in your browser if the note is a URL

## Technical Details

- Uses Upstash Vector for storing and retrieving vector embeddings
- No external LLM dependencies - uses simple text parsing and vector operations
- Performs semantic search based on vector similarity

## Development

This extension is built with Raycast's extension API using TypeScript. To develop locally:

1. Clone the repository
2. Run `npm install` to install dependencies
3. Run `npm run dev` to start in development mode

## Credits

Created by Akif Kaya.