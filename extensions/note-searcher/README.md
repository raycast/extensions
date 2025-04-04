# Raycast Note Searcher

A Raycast extension for semantic note searching and organization, powered by Upstash Vector Database.

## Features

- **Add Notes**: Quickly add notes with automatic categorization
- **Add Reminders**: Create reminders with date and time
- **Add URLs**: Add web content with automatic metadata extraction
- **Use Templates**: Create notes from predefined templates
- **Search Notes**: Search your notes semantically

## Commands

### Add Note
A simple command to quickly add a note or URL. It automatically:
- Detects if the input is a URL and extracts metadata
- Categorizes the note based on content (travel, password, code, etc.)
- Extracts important data (emails, dates, phone numbers)

### Add Reminder
Create reminders with:
- Title and description
- Date selection
- Hour and minute selection

### Add URL
A form-based interface to add a URL with:
- Metadata extraction
- Custom title and notes

### Use Template
Create notes from predefined templates:
- Shopping lists
- Travel plans
- Password entries
- Contact information
- Code snippets

### Search Note
Semantic search for your notes:
- Find similar notes by meaning, not just keywords
- Filter by category
- View and copy note content

## Installation

### From Source
1. Clone this repository
2. Navigate to the project directory
3. Install dependencies:
   ```
   npm install
   ```
4. Build and install the extension:
   ```
   npm run dev
   ```

### Configuration
The extension uses [Upstash Vector](https://upstash.com/vector) for storing and searching notes. The connection is pre-configured, but you can modify the credentials in `src/utils/index.ts` if needed.

## Development

To contribute to this extension:

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

## Technologies

- Raycast Extensions API
- TypeScript
- Upstash Vector Database

## Technical Details

- Uses Upstash Vector for storing and retrieving vector embeddings
- No external LLM dependencies - uses simple text parsing and vector operations
- Performs semantic search based on vector similarity

## Credits

Created by Akif Kaya.