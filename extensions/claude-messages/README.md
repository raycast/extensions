# Claude Code Helper Extension

A memory-efficient Raycast extension to view and copy your latest Claude conversation messages across all projects.

## Features

- **Single Entry Point**: One command "Claude Code Helper Extension" with organized options
- **My Sent Messages**: View and copy the last 10 messages you sent to Claude
- **Claude's Responses**: View and copy the last 10 messages you received from Claude
- **Search**: Search through your messages
- **Copy Options**: Copy full message with timestamp or just the content
- **Memory Efficient**: Optimized to handle large conversation histories without crashing
- **Multi-Project Support**: Scans across all your Claude Code projects
- **Smart Filtering**: Automatically filters out interrupted requests and system messages

## Installation

1. Navigate to the extension directory:
   ```bash
   cd /Users/personal/Downloads/marcosp-com-raycast-extensions/raycast-extensions/claude-messages/
   ```

2. Install dependencies (if not already done):
   ```bash
   npm install
   ```

3. Start the extension in development mode:
   ```bash
   npm run dev
   ```

4. The extension will automatically appear in Raycast. You can find it by:
   - Opening Raycast (⌘ + Space)
   - Searching for "Claude Code Helper Extension"

5. The extension will remain available in Raycast even after stopping the dev server with `⌃ C`

## How to Use

1. Open Raycast (⌘ + Space)
2. Type "Claude" to find "Claude Code Helper Extension"
3. Select it to see two options:
   - **Claude's Responses** - View messages received from Claude
   - **My Sent Messages** - View messages sent to Claude
4. Each option shows up to 10 most recent messages with time stamps
5. Use the search bar to filter messages
6. Select any message to copy it (full message, content only, or preview)

## How It Works

### Memory-Efficient Architecture
The extension uses a sophisticated streaming approach to handle large conversation histories:

1. **Smart Project Selection**: Only scans the 5 most recently modified projects
2. **File Limiting**: Processes only the 3 most recent conversation files per project
3. **Streaming Parsing**: Uses Node.js streams to read JSONL files line-by-line instead of loading entire files into memory
4. **Early Termination**: Stops scanning once it finds 10 messages of each type
5. **Role-Specific Filtering**: Separate streaming parsers for user vs assistant messages

### Data Source
- Reads from `~/.claude/projects/` where Claude Code stores conversation history
- Each project has JSONL files containing timestamped message exchanges
- Files are sorted by modification time to find the most recent conversations first

### Performance Optimizations
- **Before**: Would attempt to read 600+ files across 24+ projects → Out of Memory
- **After**: Reads ~15 files maximum across 5 projects → Runs smoothly
- Sequential processing prevents memory buildup
- Automatic cleanup of file handles and streams

## Requirements

- Raycast 1.26.0 or higher
- Node.js 22.14+
- Claude Code with local message history

## File Structure

```
claude-messages-raycast/
├── src/
│   ├── sent-messages.tsx      # Command for viewing sent messages
│   ├── received-messages.tsx  # Command for viewing received messages
│   └── utils/
│       └── claudeMessages.ts  # Core logic for reading Claude messages
├── package.json
├── tsconfig.json
└── README.md
```

## Development

1. Clone this repository
2. Run `npm install` to install dependencies
3. Run `npm run build` to compile TypeScript
4. Install in Raycast for testing

## Notes

- Messages are stored locally on your machine by Claude Code
- The extension only reads existing messages, it doesn't modify anything
- Messages older than 30 days may be automatically cleaned up by Claude Code
- Search functionality helps you quickly find specific messages