# Inbox Capture - Raycast Extension

A Raycast extension for ultra-fast capture of thoughts and ideas to your inbox folder.

## Features

- **Quick Capture**: Global hotkey → type → CMD+Enter → saved
- **Multi-line Support**: Text area expands to show all content
- **Auto-formatting**: Automatically adds frontmatter with status and next-steps
- **Silent Operation**: Saves without notifications for minimal disruption
- **Error Recovery**: Copies to clipboard if save fails
- **Configurable Path**: Set your inbox location in preferences

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the extension:
   ```bash
   npm run build
   ```

3. Install in Raycast:
   ```bash
   npm run dev
   ```

4. Configure your inbox path in Raycast preferences

5. Assign a global hotkey in Raycast settings

## Usage

1. Press your global hotkey
2. Type or paste your thought
3. Press `Enter` for new lines
4. Press `CMD+Enter` to save
5. The window closes automatically

## Configuration

Set your inbox path in Raycast preferences. The extension supports:
- Absolute paths: `/Users/you/Documents/inbox`
- Home directory paths: `~/Documents/inbox`

## File Format

Files are saved with:
- Timestamp filename: `2025-06-17-094523.md`
- Frontmatter:
  ```yaml
  ---
  status: active
  type: inbox
  next-steps: waiting-for-Claude
  ---
  ```

## Error Handling

If saving fails:
1. Content is automatically copied to clipboard
2. You can manually save it
3. No data is lost

## Development

- `npm run dev` - Run in development mode
- `npm run build` - Build for production
- `npm run lint` - Check for issues
- `npm run fix-lint` - Fix linting issues

## Workflow Integration

This extension is designed for:
- ADHD-friendly quick capture
- Integration with NotePlan/DEVONthink
- Processing by AI assistants
- Zero-friction thought capture