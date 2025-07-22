# Pastable Clipboard History

A Raycast extension that provides direct access to your clipboard history with dedicated keyboard shortcuts for positions 0-5.

## Features

- 6 instant paste commands for clipboard positions 0-5
- No-view mode for instant execution without UI
- Keyboard shortcuts for rapid workflows
- Error handling for empty clipboard positions
- HUD notifications with content preview

## Commands

| Command         | Description                       | Offset |
| --------------- | --------------------------------- | ------ |
| `paste-current` | Paste Current Clipboard Item      | 0      |
| `paste-first`   | Paste 1st Previous Clipboard Item | 1      |
| `paste-second`  | Paste 2nd Previous Clipboard Item | 2      |
| `paste-third`   | Paste 3rd Previous Clipboard Item | 3      |
| `paste-fourth`  | Paste 4th Previous Clipboard Item | 4      |
| `paste-fifth`   | Paste 5th Previous Clipboard Item | 5      |

## Usage

### Setting Up Keyboard Shortcuts

1. Open Raycast Settings (`⌘ + ,`)
2. Navigate to **Extensions** → **Pastable Clipboard History**
3. Assign keyboard shortcuts for frequently used positions

Suggested shortcuts:

```
⌘ + ⇧ + 0   →   Paste Current Clipboard Item
⌘ + ⇧ + 1   →   Paste 1st Previous Clipboard Item
⌘ + ⇧ + 2   →   Paste 2nd Previous Clipboard Item
⌘ + ⇧ + 3   →   Paste 3rd Previous Clipboard Item
⌘ + ⇧ + 4   →   Paste 4th Previous Clipboard Item
```

## Technical Details

- **Framework**: TypeScript with Raycast API
- **Mode**: No-view for instant execution
- **Error Handling**: Clear feedback for empty positions

### Implementation

```typescript
// Shared utility function
async function pasteClipboardAtPosition(offset: number, positionName: string);

// Usage in each command
await pasteClipboardAtPosition(0, "current");
await pasteClipboardAtPosition(1, "1st previous");
```

## Development

### Prerequisites

- Node.js 16.10 or higher
- npm 7.0 or higher
- Raycast app installed on macOS

### Project Structure

```
pastable-clipboard-history/
├── package.json                 # Extension manifest
├── tsconfig.json                # TypeScript configuration
├── assets/
│   └── clipboard.png            # Extension icon
└── src/
    ├── paste-utils.ts           # Shared utility function
    ├── paste-current.tsx        # Position 0 command
    ├── paste-first.tsx          # Position 1 command
    ├── paste-second.tsx         # Position 2 command
    ├── paste-third.tsx          # Position 3 command
    ├── paste-fourth.tsx         # Position 4 command
    └── paste-fifth.tsx          # Position 5 command
```

### Scripts

```bash
npm run dev      # Start development with hot reloading
npm run build    # Build for production
npm run lint     # Run linting
npm run fix-lint # Fix linting issues
```

## FAQ

**Q: Why not just use Raycast's built-in clipboard history?**
A: This extension provides instant access without opening any interface, like speed dial for your clipboard.

**Q: What happens if a position doesn't exist?**
A: You'll get a clear error message indicating that position is empty.

## License

MIT License - see the [LICENSE](LICENSE) file for details.
