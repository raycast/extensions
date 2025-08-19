# Contributing to Claude Code Opener

Thanks for your interest in contributing! This guide will help you get started.

## Development Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/claude-code-opener.git
cd claude-code-opener

# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build the extension
npm run build

# Run linter and fix issues
npm run fix-lint
```

## Adding Terminal Support

The extension uses an adapter pattern to support different terminals. Here's how to add a new one:

### 1. Create Your Adapter

In `src/terminal-adapters.ts`, create a new class extending `BaseTerminalAdapter`:

```typescript
import { BaseTerminalAdapter } from './terminal-adapters';

export class ITerm2Adapter extends BaseTerminalAdapter {
  name = "iTerm2";
  bundleId = "com.googlecode.iterm2";
  
  async open(directory: string, claudeBinary: string): Promise<void> {
    // Your implementation here
    // Available utilities:
    // - this.escapeShellArg(str) - escapes shell arguments
    // - this.getUserShell() - returns user's shell path
    
    // Example implementation:
    const script = `
      tell application "iTerm2"
        create window with default profile
        tell current session of current window
          write text "cd '${this.escapeShellArg(directory)}'"
          write text "'${this.escapeShellArg(claudeBinary)}'"
        end tell
      end tell
    `;
    
    await execAsync(`osascript -e '${script.replace(/'/g, "'\"'\"'").replace(/\n/g, "' -e '")}'`);
  }
}
```

**Finding the Bundle ID:**
```bash
osascript -e 'id of app "YourTerminalName"'
```

### 2. Register Your Adapter

Add your adapter to the registry in `terminal-adapters.ts`:

```typescript
const TERMINAL_ADAPTERS = new Map<string, TerminalAdapter>([
  ["Terminal", new TerminalAppAdapter()],
  ["Alacritty", new AlacrittyAdapter()],
  ["iTerm2", new ITerm2Adapter()], // Add this line
]);
```

### 3. Update TypeScript Types

In `src/open-claude-code.tsx`, update the Preferences interface:

```typescript
interface Preferences {
  claudeBinaryPath: string;
  terminalApp: "Terminal" | "Alacritty" | "iTerm2"; // Add your terminal
}
```

### 4. Add to User Preferences

In `package.json`, add your terminal to the dropdown options:

```json
{
  "name": "terminalApp",
  "type": "dropdown",
  "data": [
    { "title": "Terminal", "value": "Terminal" },
    { "title": "Alacritty", "value": "Alacritty" },
    { "title": "iTerm2", "value": "iTerm2" } // Add this
  ]
}
```

### 5. Test Your Implementation

1. Run `npm run dev` to test in development mode
2. Try opening different directories
3. Test edge cases:
   - Paths with spaces
   - Paths with special characters
   - Non-existent directories
   - When terminal is already open vs closed

### 6. Submit a Pull Request

1. Fork the repository
2. Create a feature branch: `git checkout -b add-iterm2-support`
3. Commit your changes: `git commit -m "Add iTerm2 terminal adapter"`
4. Push to your fork: `git push origin add-iterm2-support`
5. Open a pull request with:
   - Description of the terminal you're adding
   - Any special requirements or limitations
   - Screenshots showing it working

## Code Style Guidelines

- Use TypeScript strict mode
- Follow the existing code patterns
- Keep functions small and focused
- Use descriptive variable names
- Add types for all parameters and return values

## Testing Checklist

Before submitting a PR, ensure:

- [ ] Extension builds without errors: `npm run build`
- [ ] Linter passes: `npm run lint`
- [ ] Terminal opens correctly in all scenarios
- [ ] Error handling works (invalid paths, missing binary)
- [ ] Code follows existing patterns

## Common Terminal Implementation Patterns

### AppleScript-based Terminals (macOS)
Most macOS terminals support AppleScript. See `TerminalAppAdapter` for an example.

### Command-line Argument Terminals
Some terminals accept commands via CLI args. See `AlacrittyAdapter` for an example.

### Things to Consider

1. **Shell Detection**: Use `this.getUserShell()` to respect user's shell preference
2. **Path Escaping**: Always use `this.escapeShellArg()` for paths
3. **Cleanup**: Remove temporary files if your implementation creates any
4. **Error Messages**: Provide clear error messages for common failures

## Questions?

Feel free to open an issue for discussion before implementing major changes.